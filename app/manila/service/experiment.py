from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, KFold
from sklearn.metrics import accuracy_score


def run_exp(data):
    fold = KFold(n_splits=5, shuffle=True)
    for train, test in fold.split(data):
        df_train = data.iloc[train]
        df_test = data.iloc[test]
        X_train = df_train.drop(columns=["credit"])
        y_train = df_train["credit"]
        X_test = df_test.drop(columns=["credit"])
        y_test = df_test["credit"]
        model = LogisticRegression()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        return model, {"accuracy": accuracy}
