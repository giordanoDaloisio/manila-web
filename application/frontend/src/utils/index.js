export function downloadCSV(array) {
  const link = document.createElement("a");
  let csv = convertArrayOfObjectsToCSV(array);
  if (csv == null) return;

  const filename = "report.csv";

  if (!csv.match(/^data:text\/csv/i)) {
    csv = `data:text/csv;charset=utf-8,${csv}`;
  }

  link.setAttribute("href", encodeURI(csv));
  link.setAttribute("download", filename);
  link.click();
}

function convertArrayOfObjectsToCSV(array) {
  let result;
  const columnDelimiter = ",";
  const lineDelimiter = "\n";
  const keys = Object.keys(array[0]);

  result = "";
  result += keys.join(columnDelimiter);
  result += lineDelimiter;

  array.forEach((item) => {
    let ctr = 0;
    keys.forEach((key) => {
      if (ctr > 0) result += columnDelimiter;

      result += item[key];

      ctr++;
    });
    result += lineDelimiter;
  });

  return result;
}

export function labelMapper(value) {
  if (value === "acc") {
    return "Accuracy";
  }
  if (value === "disp_imp") {
    return "Disparate Impact";
  }
  if (value === "hmean") {
    return "Harmonic Mean";
  }
  if (value === "stat_par") {
    return "Statistical Parity";
  }
  if (value === "fairness_method") {
    return "Fairness Method";
  }
  if (value === "model") {
    return "Machine Learning Model";
  }
  if (value === "ao") {
    return "Average Odds";
  }
  if (value === "eq_odds") {
    return "Equalized Odds";
  }
  if (value === "euclidean_distance") {
    return "Euclidean Distance";
  }
  if (value === "manhattan_distance") {
    return "Manhattan Distance";
  }
  if (value === "mahalanobis_distance") {
    return "Mahalanobis Distance";
  }
  if (value === "weighted_mean") {
    return "Weighted Mean";
  }
  return value;
}

export function parseData(data) {
  if (data === "RW") {
    return "Reweighing";
  } else if (data === "AD") {
    return "Adversarial Debiasing";
  } else if (data === "NO_ONE") {
    return "No Method";
  } else if (data === "DEMV") {
    return "DEMV";
  } else if (data === "EG") {
    return "Exponential Gradient";
  } else if (data === "GRID") {
    return "Grid Search";
  } else if (data === "GERRY") {
    return "GerryFair";
  } else if (data === "META") {
    return "MetaFair";
  } else if (data === "PREJ") {
    return "Prejudice Remover";
  } else if (data === "REJ") {
    return "Reject Option Classification";
  } else if (data === "logreg") {
    return "Logistic Regression";
  } else if (data === "svm") {
    return "Support Vector Machine";
  } else if (data === "gradient_class") {
    return "Gradient Boosting Classifier";
  } else if (data === "mlp") {
    return "Multi-Layer Perceptron";
  } else if (data === "tree") {
    return "Decision Tree";
  } else if (data === "forest") {
    return "Random Forest";
  } else if (data === "DIR") {
    return "Disparate Impact Remover";
  }
  return parseFloat(data).toFixed(2);
}
