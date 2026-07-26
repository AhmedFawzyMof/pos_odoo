import { storeToRefs } from "pinia";
import { useDbStore, AVAILABLE_DBS } from "../../stores/db";

export const useDb = () => {
  const store = useDbStore();
  const { selectedDb } = storeToRefs(store);

  return {
    currentDb: selectedDb,
    setDb: store.setDb,
    availableDatabases: AVAILABLE_DBS,
  };
};
