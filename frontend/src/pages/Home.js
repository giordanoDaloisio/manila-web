import { Button, Flex, Heading } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FORM } from "../routes";

function Home() {

  return (
    <Flex direction="column" align='center' justifyContent='space-between'>
      <Heading>MANILA</Heading>
      <Link to={FORM}>
        <Button>Begin</Button>
      </Link>
    </Flex>
  );
}

export default Home;
