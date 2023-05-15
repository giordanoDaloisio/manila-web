from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, KFold
from sklearn.metrics import accuracy_score
from aif360.algorithms.preprocessing import Reweighing
from aif360.datasets import BinaryLabelDataset


def run_exp(data):
    fold = KFold(n_splits=5, shuffle=True)
    rw = Reweighing([{"sex": 0}], [{"sex": 1}])
    for train, test in fold.split(data):
        df_train = data.iloc[train]
        df_test = data.iloc[test]
        bin_data = BinaryLabelDataset(
            favorable_label=1,
            unfavorable_label=0,
            df=df_train,
            label_names=[1],
            protected_attribute_names=["sex"],
        )
        rw_data = rw.fit_transform(bin_data)
        weights = rw_data.instance_weights
        df_train, _ = rw_data.convert_to_dataframe()
        X_train = df_train.drop(columns=["credit"])
        y_train = df_train["credit"]
        X_test = df_test.drop(columns=["credit"])
        y_test = df_test["credit"]
        model = LogisticRegression()
        model.fit(X_train, y_train, sample_weight=weights)
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        return model, {"accuracy": accuracy}
