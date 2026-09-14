import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
accuracy_score,
confusion_matrix,
classification_report
)

from sklearn.metrics import ConfusionMatrixDisplay

import matplotlib.pyplot as plt

# ---------------------------------------------------------

# 1. LOAD DATASET

# ---------------------------------------------------------

df = pd.read_csv(
r"C:\Users\aparn\Downloads\dataset_combined_cleaned.csv"
)

print("Dataset shape:", df.shape)
print(df.head())

# ---------------------------------------------------------

# 2. REMOVE UNNECESSARY COLUMN

# ---------------------------------------------------------

# source_sheet is only the source of the data.

# It should not be used for prediction.

df = df.drop("source_sheet", axis=1)

# ---------------------------------------------------------

# 3. SEPARATE SCHOLARSHIP NAME

# ---------------------------------------------------------

# We need scholarship name later for recommendation.

scholarship_names = df["name"]

# Remove name from ML features

X = df.drop(
["name", "outcome"],
axis=1
)

# Target

y = df["outcome"]

# ---------------------------------------------------------

# 4. IDENTIFY CATEGORICAL COLUMNS

# ---------------------------------------------------------

categorical_columns = X.select_dtypes(
include=["object"]
).columns

print("\nCategorical columns:")
print(list(categorical_columns))

# ---------------------------------------------------------

# 5. PREPROCESSING

# ---------------------------------------------------------

preprocessor = ColumnTransformer(
transformers=[
(
"categorical",
OneHotEncoder(
handle_unknown="ignore"
),
categorical_columns
)
],
remainder="passthrough"
)

# ---------------------------------------------------------

# 6. CREATE RANDOM FOREST PIPELINE

# ---------------------------------------------------------

model = Pipeline([
(
"preprocessing",
preprocessor
),


(
    "rf",
    RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=20,
        min_samples_leaf=10,
        random_state=42,
        class_weight=None,
        n_jobs=-1
    )
)


])

# ---------------------------------------------------------

# 7. BALANCE THE DATASET

# ---------------------------------------------------------

# Get all eligible records

eligible = df[
df["outcome"] == 1
]

# Randomly select the same number

# of not-eligible records

not_eligible = df[df["outcome"] == 0].sample(n=len(eligible),random_state=42)

# Combine both classes

balanced_df = pd.concat([
eligible,
not_eligible
])

# Shuffle the balanced dataset

balanced_df = balanced_df.sample(
frac=1,
random_state=42
).reset_index(drop=True)

print("\nBalanced dataset:")
print(
balanced_df["outcome"].value_counts()
)

# ---------------------------------------------------------

# 8. SEPARATE FEATURES AND TARGET

# ---------------------------------------------------------

X = balanced_df.drop(
["name", "outcome"],
axis=1
)

y = balanced_df["outcome"]

# ---------------------------------------------------------

# 9. TRAIN-TEST SPLIT

# ---------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
X,
y,
test_size=0.3,
random_state=42,
stratify=y
)

# ---------------------------------------------------------
# 10. TUNE RANDOM FOREST
# ---------------------------------------------------------

print("\nTuning Random Forest ...")

param_grid = {
    "rf__n_estimators": [50, 100, 200],
    "rf__max_depth": [5, 10, 15, 20],
    "rf__min_samples_split": [10, 20],
    "rf__min_samples_leaf": [5, 10]
}

grid_search = GridSearchCV(
    model,
    param_grid,
    cv=3,
    scoring="f1",
    n_jobs=-1
)

grid_search.fit(
    X_train,
    y_train
)

print("\nBest Parameters:")
print(grid_search.best_params_)

print("\nBest Cross-Validation F1:")
print(grid_search.best_score_)

# Best tuned model
model = grid_search.best_estimator_



# ---------------------------------------------------------

# 11. PREDICT TEST DATA

# ---------------------------------------------------------

y_pred = model.predict(
X_test
)

# ---------------------------------------------------------

# 12. CALCULATE ACCURACY

# ---------------------------------------------------------

accuracy = accuracy_score(
y_test,
y_pred
)

print("\n==============================")
print("RANDOM FOREST MODEL ACCURACY")
print("==============================")

print(
"Accuracy:",
accuracy
)

print(
"Accuracy (%):",
accuracy * 100
)

# ---------------------------------------------------------

# 13. CONFUSION MATRIX

# ---------------------------------------------------------

cm = confusion_matrix(
y_test,
y_pred
)

print("\nConfusion Matrix:")
print(cm)

# ---------------------------------------------------------

# 14. CLASSIFICATION REPORT

# ---------------------------------------------------------

print("\nClassification Report:")

print(
classification_report(
y_test,
y_pred,
target_names=[
"Not Eligible",
"Eligible"
]
)
)

# ---------------------------------------------------------

# 15. DISPLAY CONFUSION MATRIX

# ---------------------------------------------------------

ConfusionMatrixDisplay(
confusion_matrix=cm,
display_labels=[
"Not Eligible",
"Eligible"
]
).plot()

plt.title(
"Random Forest Scholarship Eligibility"
)

plt.show()

# =========================================================

# SCHOLARSHIP RECOMMENDATION

# =========================================================

print("\n==============================")
print("SCHOLARSHIP RECOMMENDATION")
print("==============================")

# ---------------------------------------------------------

# 16. TAKE STUDENT INPUT

# ---------------------------------------------------------

print("\nEnter student details:\n")

education = input(
"Education qualification: "
)

gender = input(
"Gender: "
)

community = input(
"Community: "
)

religion = input(
"Religion: "
)

exservice = input(
"Ex-service men (Yes/No): "
)

disability = input(
"Disability (Yes/No): "
)

sports = input(
"Sports (Yes/No): "
)

percentage = input(
"Annual percentage: "
)

income = input(
"Income: "
)

india = input(
"India (In/Out): "
)

# ---------------------------------------------------------

# 17. CREATE STUDENT DATAFRAME

# ---------------------------------------------------------

student = pd.DataFrame({
"education_qualification": [
    education
],

"gender": [
    gender
],

"community": [
    community
],

"religion": [
    religion
],

"exservice_men": [
    exservice
],

"disability": [
    disability
],

"sports": [
    sports
],

"annual_percentage": [
    percentage
],

"income": [
    income
],

"india": [
    india
]


})

# ---------------------------------------------------------

# 18. PREDICT ELIGIBILITY

# ---------------------------------------------------------

prediction = model.predict(student)[0]

print("\nStudent eligibility prediction:")

if prediction == 1:
    print("ELIGIBLE")
else:
    print("NOT ELIGIBLE")


# ---------------------------------------------------------

# 19. RECOMMEND SCHOLARSHIPS

# ---------------------------------------------------------

if prediction == 1:
    print(
        "\nFinding suitable scholarships..."
    )

    # Take only scholarships
    # containing eligible records

    eligible_scholarships = df[
        df["outcome"] == 1
    ].copy()


    # Student features to compare

    features = [

        "education_qualification",

        "gender",

        "community",

        "religion",

        "exservice_men",

        "disability",

        "sports",

        "annual_percentage",

        "income",

        "india"

    ]


    # Student's input values

    student_values = student.iloc[0]


    # Start match score at 0

    eligible_scholarships[
        "match_score"
    ] = 0


    # Compare each feature

    for feature in features:
        eligible_scholarships["match_score"] += (eligible_scholarships[feature].astype(str).str.lower()== str(student_values[feature ]).lower()).astype(int)


    # Sort by highest match score

    eligible_scholarships = (
        eligible_scholarships .sort_values("match_score",ascending=False)
    )


    # Remove duplicate scholarship names

    eligible_scholarships = (
        eligible_scholarships
        .drop_duplicates(
            subset=["name"]
        )
    )


    # Get top 5 scholarships

    top_scholarships = (eligible_scholarships.head(5))


    # -----------------------------------------------------
    # DISPLAY RECOMMENDATIONS
    # -----------------------------------------------------

    print( "\nRecommended Scholarships:")

    print( "--------------------------------")


    for i, row in enumerate(
        top_scholarships.itertuples(),
        start=1
    ):

        print(
            f"{i}. {row.name} "
            f"(Match Score: "
            f"{row.match_score}/10)"
        )
else:
    print("\nNo scholarships recommended.")
    print("Student was predicted as NOT ELIGIBLE.")
