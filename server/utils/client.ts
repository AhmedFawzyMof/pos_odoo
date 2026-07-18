import Odoo from "odoo-await";

export const connectToOdoo = (
  username: string,
  password: string,
  companyId?: number,
) => {
  const odoo = new Odoo({
    baseUrl: process.env.DEFAULT_URL!,
    db: process.env.DEFAULT_DB!,
    username,
    password,
  });

  if (companyId) {
    const origExecuteKw = odoo.execute_kw.bind(odoo);
    odoo.execute_kw = function (
      model: string,
      method: string,
      params: any[],
    ) {
      if (params.length > 0) {
        const lastIdx = params.length - 1;
        const last = params[lastIdx];
        if (last && typeof last === "object" && !Array.isArray(last)) {
          // Last param is a kwargs dict — merge context into it
          params[lastIdx] = {
            ...last,
            context: {
              ...(last.context || {}),
              allowed_company_ids: [companyId],
            },
          };
        } else {
          // Last param is not a kwargs dict — add context as a separate kwargs dict
          params.push({ context: { allowed_company_ids: [companyId] } });
        }
      }
      return origExecuteKw(model, method, params);
    };
  }

  return odoo;
};
