import {
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  ListItem,
  Text,
  UnorderedList,
  useColorModeValue,
} from "@chakra-ui/react";

import { useLocation, useNavigate } from "react-router-dom";
import AggregationResults from "../components/AggregationResults";
import Container from "../components/Container";
import { HOME } from "../routes";
import ParetoResults from "../components/ParetoResults";

function Results() {
  const loc = useLocation();
  const results = loc.state.results;
  const model_link = loc.state.model_path;
  const pareto = loc.state.pareto;
  const navigate = useNavigate();

  return (
    <Box
      p='60px'
      minH={"100vh"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}>
      <Grid templateColumns={"(3, 1fr)"}>
        <GridItem w='100%' h='0' pl='4'>
          <Button onClick={() => navigate(HOME)} colorScheme='facebook'>
            Back
          </Button>
        </GridItem>
        <GridItem w='100%'>
          <Heading align='center' pb={6}>
            Results
          </Heading>
        </GridItem>
      </Grid>
      {pareto ? (
        <ParetoResults
          pareto={pareto}
          model_link={model_link}
          results={results}
        />
      ) : (
        <AggregationResults model_link={model_link} results={results} />
      )}
      <Container title='How to read the metrics'>
        <UnorderedList>
          <ListItem>
            <Text as='b'>Classification Metrics</Text>
            <Text>
              These metrics are used to evaluate the performance of a
              classification and have an optimal value equal to{" "}
              <Text as='b'>one</Text>.
            </Text>
            <Text>
              The only exception is <Text as='b'>Zero One Loss</Text> which has
              an optimal value equal to <Text as='b'>zero</Text>.
            </Text>
          </ListItem>
          <ListItem>
            <Text as='b'>Regression Metrics</Text>
            <Text>
              These metrics measure the error of the predictions of the model
              and have an optimal value equal to <Text as='b'>zero</Text>.
            </Text>
          </ListItem>
          <ListItem>
            <Text as='b'>Fairness Metrics</Text>
            <Text>
              These metrics measure the fairness of the predictions of the model
              and have an optimal value equal to <Text as='b'>zero</Text>.
            </Text>
            <Text>
              The only exception is <Text as='b'>Disparate Impact</Text> which
              has an optimal value equal to <Text as='b'>one</Text>.
            </Text>
          </ListItem>
        </UnorderedList>
      </Container>
    </Box>
  );
}

export default Results;
