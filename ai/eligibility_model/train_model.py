"""Reproducible, leakage-aware eligibility model training."""
from __future__ import annotations
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import GroupShuffleSplit
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "collections" / "dataset_combined_cleaned.csv"
OUT = Path(__file__).resolve().parent
FEATURES = ["education_qualification", "gender", "community", "religion", "exservice_men", "disability", "sports", "annual_percentage", "income", "india"]
def pipe(model): return Pipeline([("preprocessing", ColumnTransformer([("categorical", OneHotEncoder(handle_unknown="ignore"), FEATURES)])), ("model", model)])
def score(name, model, x, y):
    p=model.predict(x); precision,recall,f1,_=precision_recall_fscore_support(y,p,labels=[0,1],zero_division=0)
    return {"model":name,"accuracy":accuracy_score(y,p),"eligible_precision":precision[1],"eligible_recall":recall[1],"eligible_f1":f1[1],"confusion_matrix":confusion_matrix(y,p,labels=[0,1]).tolist(),"per_class":classification_report(y,p,labels=[0,1],output_dict=True,zero_division=0)}
def main():
    frame=pd.read_csv(DATA); missing=set(FEATURES+["name","outcome"])-set(frame.columns)
    if missing: raise ValueError(f"Dataset missing columns: {sorted(missing)}")
    frame=frame.drop_duplicates().dropna(subset=FEATURES+["outcome","name"]).copy(); frame["outcome"]=pd.to_numeric(frame.outcome,errors="coerce"); frame=frame[frame.outcome.isin([0,1])]
    # Keep training repeatable and deployable on modest machines while retaining
    # class proportions from this large source dataset.
    if len(frame) > 50000: frame = pd.concat([part.sample(n=min(len(part), 25000), random_state=42) for _, part in frame.groupby("outcome")], ignore_index=True)
    x,y,groups=frame[FEATURES],frame.outcome.astype(int),frame.name.astype(str)
    tr,te=next(GroupShuffleSplit(n_splits=1,test_size=.25,random_state=42).split(x,y,groups)); xt,xv,yt,yv=x.iloc[tr],x.iloc[te],y.iloc[tr],y.iloc[te]
    models={"knn":pipe(KNeighborsClassifier(n_neighbors=9,weights="distance")),"decision_tree":pipe(DecisionTreeClassifier(max_depth=12,min_samples_leaf=8,class_weight="balanced",random_state=42)),"random_forest_balanced":pipe(RandomForestClassifier(n_estimators=80,min_samples_leaf=4,class_weight="balanced",random_state=42,n_jobs=1))}
    report={"dataset_rows":len(frame),"train_rows":len(xt),"test_rows":len(xv),"features":FEATURES,"excluded_features":["name","source_sheet"],"models":[]}
    for name,model in models.items(): model.fit(xt,yt); report["models"].append(score(name,model,xv,yv))
    best=max(report["models"],key=lambda m:(m["eligible_f1"],m["eligible_recall"])); production=models[best["model"]]; production.fit(xt,yt); joblib.dump(production,OUT/"scholarship_model.joblib")
    report.update({"selected_model":best["model"],"selection_basis":"eligible-class F1, then eligible-class recall"}); (OUT/"model_metadata.json").write_text(json.dumps(report,indent=2),encoding="utf-8"); print(json.dumps({"selected_model":best["model"],"eligible_f1":best["eligible_f1"],"eligible_recall":best["eligible_recall"]},indent=2))
if __name__ == "__main__": main()
