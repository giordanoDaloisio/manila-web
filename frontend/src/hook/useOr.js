import { useEffect, useState } from "react";

export const useOr = (handleChangeCheckbox, setError) => {
  const [classCount, setClassCount] = useState(0);
  useEffect(() => {
    classCount === 0 ? setError(true) : setError(false);
  }, [classCount]);

  const handleOr = (e) => {
    if (e.target.checked) {
      setClassCount(classCount + 1);
    } else {
      setClassCount(classCount - 1);
    }
    handleChangeCheckbox(e);
  };
  return [classCount, handleOr];
};
