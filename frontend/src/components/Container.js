import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import React from "react";

function Container({ title, children }) {
  return (
    <Card
      p='5px'
      m='10px'
      bg={useColorModeValue("white", "gray.700")}
      boxShadow={"lg"}>
      <CardHeader align='center'>
        <Heading as='h2' size='lg'>
          {title}
        </Heading>
      </CardHeader>
      <CardBody>
        <VStack align='flex-start' spacing='20px'>
          {children}
        </VStack>
      </CardBody>
    </Card>
  );
}

export default Container;
