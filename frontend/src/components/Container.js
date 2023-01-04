import { Card, CardBody, CardHeader, Heading, VStack } from "@chakra-ui/react";
import React from "react";

function Container({ title, children }) {
  return (
    <Card p='5px' m='10px'>
      <CardHeader>
        <Heading as='h2' size='lg'>
          {title}
        </Heading>
      </CardHeader>
      <CardBody>
        <VStack align='flex-start' spacing='10px'>
          {children}
        </VStack>
      </CardBody>
    </Card>
  );
}

export default Container;
