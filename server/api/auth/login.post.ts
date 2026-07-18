import { defineEventHandler, readBody } from "h3";
import { connectToOdoo } from "~~/server/utils/client";
import { tryCatch } from "~~/server/utils/tryCatch";
import { getDb } from "~~/server/db";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.username || !body.password) {
    return {
      success: false,
      error:
        "جميع الحقول (رابط الخادم، قاعدة البيانات، اسم المستخدم، كلمة المرور) مطلوبة.",
    };
  }

  const client = connectToOdoo(body.username, body.password);

  const [err, uid] = await tryCatch(client.connect());

  if (err) {
    return {
      success: false,
      error: err.message,
    };
  }

  const [userErr, userDetailsList] = await tryCatch(
    client.read<any>(
      "res.users",
      [Number(uid)],
      ["name", "company_id", "company_ids", "groups_id"],
    ),
  );

  if (userErr) {
    return {
      success: false,
      error: userErr.message,
    };
  }

  if (!userDetailsList || userDetailsList.length === 0) {
    return {
      success: false,
      error: "المستخدم غير موجود",
    };
  }

  const groupIds = userDetailsList[0].groups_id || [];

  let userPermissions: any[] = [];

  if (groupIds.length > 0) {
    const [groupError, groupRecords] = await tryCatch(
      client.read("res.groups", groupIds, ["name", "full_name", "category_id"]),
    );

    if (groupError) {
      console.warn("Could not read permission groups:", groupError);
    } else {
      userPermissions = groupRecords.map((g: any) => ({
        id: g.id,
        name: g.name,
        fullName: g.full_name || (g.category_id ? `${g.category_id[1]} / ${g.name}` : g.name),
      }));
    }
  }

  const [companyErr, companyDetailsList] = await tryCatch(
    client.read<any>("res.company", userDetailsList[0].company_ids, ["name"]),
  );

  if (companyErr) {
    return {
      success: false,
      error: companyErr.message,
    };
  }

  const allowedCompanies = (companyDetailsList || []).map((company: any) => ({
    id: company.id,
    name: company.name,
  }));

  const primaryCompanyId = userDetailsList[0].company_id[0];

  // Sync user to local SQLite
  const db = getDb();
  let localUser = db.prepare('SELECT * FROM users WHERE odoo_user_id = ?').get(Number(uid)) as any;

  if (!localUser) {
    const info = db.prepare(
      'INSERT INTO users (odoo_user_id, name, login, active) VALUES (?, ?, ?, 1)'
    ).run(Number(uid), userDetailsList[0].name, body.username.trim());
    localUser = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as any;
  } else {
    db.prepare(
      'UPDATE users SET name = ?, login = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(userDetailsList[0].name, body.username.trim(), localUser.id);
  }

  // Sync Odoo groups cache
  db.prepare('DELETE FROM user_odoo_groups WHERE user_id = ?').run(localUser.id);
  for (const g of userPermissions) {
    db.prepare(
      'INSERT INTO user_odoo_groups (user_id, odoo_group_id, group_name, full_name) VALUES (?, ?, ?, ?)'
    ).run(localUser.id, g.id, g.name, g.fullName);
  }

  // Get user's local roles — grant all if none assigned yet
  let roles = db.prepare(`
    SELECT r.name FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ?
  `).all(localUser.id).map((r: any) => r.name);

  if (roles.length === 0) {
    db.prepare('INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles').run(localUser.id);
    roles = db.prepare(`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(localUser.id).map((r: any) => r.name);
  }

  await setUserSession(event, {
    user: {
      id: localUser.id,
      odooUserId: Number(uid),
      name: userDetailsList[0].name,
      roles,
    },
    odooPassword: body.password,
    odooUsername: body.username.trim(),
    currentCompanyId: primaryCompanyId,
  });

  return {
    success: true,
    user: {
      id: Number(uid),
      name: userDetailsList[0].name,
      allowedCompanies,
      primaryCompanyId,
      userPermissions,
      roles,
    },
  };
});
