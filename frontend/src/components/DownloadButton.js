import { useState } from "react";
import { Alert, AlertIcon, Button, VStack } from "@chakra-ui/react";
import { downloadModel } from "../api";

function DownloadButton({ name, buttonLabel }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setIsLoading(true);
    setError("");
    try {
      const ris = await downloadModel(name);
      const href = URL.createObjectURL(ris.data);

      // create "a" HTML element with href to file & click
      const link = document.createElement("a");
      link.href = href;
      link.setAttribute("download", name + ".pkl");
      document.body.appendChild(link);
      link.click();

      // clean up "a" element & remove ObjectURL
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    } catch (e) {
      console.log(e);
      setError(e.message);
    }
    setIsLoading(false);
  };

  return (
    <>
      <Button onClick={download} isLoading={isLoading} colorScheme='teal'>
        {buttonLabel}
      </Button>
      {error !== "" ? (
        <Alert status='error'>
          <AlertIcon />
          {error}
        </Alert>
      ) : null}
    </>
  );
}

export default DownloadButton;
