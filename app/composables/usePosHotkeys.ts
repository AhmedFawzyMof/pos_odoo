import { ref, computed, onMounted, onUnmounted } from "vue";
import type { Ref } from "vue";
import type { PaymentMethod } from "~/types/pos";
import { usePosCartStore } from "~~/stores/pos-cart";

interface UsePosHotkeysOptions {
  paymentMethods: Ref<PaymentMethod[]>;
  sessionId: Ref<number | null>;
  showPaymentSheet: Ref<boolean>;
  showCloseSessionModal: Ref<boolean>;
  preselectMethodId?: Ref<number | null>;
  autoExpandSection?: Ref<"discount" | "customer" | null>;
  onCheckout?: () => void;
  onCashPayment?: () => void;
  onShowDiscount?: () => void;
  onToggleWeight?: () => void;
}

export function usePosHotkeys(options: UsePosHotkeysOptions) {
  const {
    paymentMethods,
    sessionId,
    showPaymentSheet,
    showCloseSessionModal,
    onCheckout,
    onCashPayment,
    onShowDiscount,
    onToggleWeight,
  } = options;

  const preselectMethodId = options.preselectMethodId ?? ref<number | null>(null);
  const autoExpandSection = options.autoExpandSection ?? ref<"discount" | "customer" | null>(null);

  const cart = usePosCartStore();

  const enabled = ref(true);

  const selectedCartIndex = ref(-1);

  function isInputFocused() {
    const el = document.activeElement;
    if (!el || el.tagName === "BODY") return false;
    return (
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.getAttribute("contenteditable") === "true"
    );
  }

  function canUseGlobalHotkeys() {
    return enabled.value && sessionId.value && !isInputFocused();
  }

  function findPaymentMethod(type: "cash" | "card"): PaymentMethod | null {
    return (
      paymentMethods.value.find((m) => {
        if (type === "cash") {
          return m.is_cash_count || /نقدي|cash/i.test(m.name);
        }
        return /card|credit|debit|بطاقة/i.test(m.name);
      }) || null
    );
  }

  function openCheckout() {
    if (!showPaymentSheet.value) {
      onCheckout?.();
    }
  }

  function clampIndex(index: number) {
    if (cart.items.length === 0) return -1;
    if (index < 0) return cart.items.length - 1;
    if (index >= cart.items.length) return 0;
    return index;
  }

  function onKeyDown(e: KeyboardEvent) {
    const key = e.key;
    const target = e.target as HTMLElement;

    const cartNavEnabled =
      enabled.value && cart.items.length > 0 && !isInputFocused();

    switch (key) {
      case "F1": {
        e.preventDefault();
        if (!canUseGlobalHotkeys()) return;
        if (onCashPayment) {
          onCashPayment();
        } else {
          const method = findPaymentMethod("cash");
          if (method) {
            openCheckout();
            preselectMethodId.value = method.id;
          }
        }
        break;
      }
      case "F2": {
        e.preventDefault();
        if (!canUseGlobalHotkeys()) return;
        if (!onCashPayment) {
          const method = findPaymentMethod("card");
          if (method) {
            openCheckout();
            preselectMethodId.value = method.id;
          }
        }
        break;
      }
      case "F3": {
        e.preventDefault();
        if (!canUseGlobalHotkeys()) return;
        if (onShowDiscount) {
          onShowDiscount();
        } else {
          openCheckout();
          autoExpandSection.value = "discount";
        }
        break;
      }
      case "F4": {
        e.preventDefault();
        if (!canUseGlobalHotkeys()) return;
        if (!onShowDiscount) {
          openCheckout();
          autoExpandSection.value = "customer";
        }
        break;
      }
      case "F5": {
        if (!enabled.value) return;
        e.preventDefault();
        onToggleWeight?.();
        break;
      }
      case "F12": {
        e.preventDefault();
        if (!canUseGlobalHotkeys()) return;
        showCloseSessionModal.value = true;
        break;
      }
      case "ArrowUp": {
        if (!cartNavEnabled) return;
        e.preventDefault();
        if (selectedCartIndex.value === -1) {
          selectedCartIndex.value = cart.items.length - 1;
        } else {
          selectedCartIndex.value = clampIndex(selectedCartIndex.value - 1);
        }
        break;
      }
      case "ArrowDown": {
        if (!cartNavEnabled) return;
        e.preventDefault();
        if (selectedCartIndex.value === -1) {
          selectedCartIndex.value = 0;
        } else {
          selectedCartIndex.value = clampIndex(selectedCartIndex.value + 1);
        }
        break;
      }
      case "+":
      case "=": {
        if (!cartNavEnabled || selectedCartIndex.value === -1) return;
        e.preventDefault();
        const item = cart.items[selectedCartIndex.value];
        if (item) {
          const isWeight = item.product.to_weight;
          const newQty = isWeight
            ? Math.round((item.quantity + 1) * 10000) / 10000
            : item.quantity + 1;
          cart.updateQuantity(
            item.product.id,
            newQty,
          );
        }
        break;
      }
      case "-":
      case "_": {
        if (!cartNavEnabled || selectedCartIndex.value === -1) return;
        e.preventDefault();
        const item = cart.items[selectedCartIndex.value];
        if (item) {
          const isWeight = item.product.to_weight;
          const min = isWeight ? 0.01 : 1;
          const newQty = isWeight
            ? Math.round((item.quantity - 1) * 10000) / 10000
            : item.quantity - 1;
          if (newQty >= min) {
            cart.updateQuantity(item.product.id, newQty);
          }
        }
        break;
      }
      case "Delete":
      case "Backspace": {
        if (!cartNavEnabled || selectedCartIndex.value === -1) return;
        e.preventDefault();
        const item = cart.items[selectedCartIndex.value];
        if (item) {
          cart.removeItem(item.product.id);
          selectedCartIndex.value = clampIndex(selectedCartIndex.value);
        }
        break;
      }
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", onKeyDown);
  });

  return {
    enabled,
    selectedCartIndex,
  };
}
