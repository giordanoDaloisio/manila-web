from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


def run_exp(data):
    df_train, df_test = train_test_split(data, test_size=0.2)
    X_train = df_train.drop(columns=["credit"])
    y_train = df_train["credit"]
    X_test = df_test.drop(columns=["credit"])
    y_test = df_test["credit"]
    model = LogisticRegression()
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    return model, {"accuracy": accuracy}
