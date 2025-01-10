import { Button } from "@chakra-ui/react";

function ExportButton({ onExport, label }) {
  return <Button onClick={(e) => onExport(e.target.value)}>{label}</Button>;
}

export default ExportButton;
