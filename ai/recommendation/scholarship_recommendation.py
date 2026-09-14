
import pandas as pd


# =========================================================
# SCHOLARSHIP RECOMMENDATION SYSTEM
# =========================================================

# ---------------------------------------------------------
# 1. LOAD DATASET
# ---------------------------------------------------------

df = pd.read_csv(
    r"C:\Users\aparn\Downloads\dataset_combined_cleaned.csv"
)

# Remove unnecessary column
df = df.drop("source_sheet", axis=1)


# ---------------------------------------------------------
# 2. TAKE STUDENT INPUT
# ---------------------------------------------------------

print("\n======================================")
print("SCHOLARSHIP RECOMMENDATION SYSTEM")
print("======================================")

print("\nEnter student details:\n")

education = input("Education qualification: ")
gender = input("Gender: ")
community = input("Community: ")
religion = input("Religion: ")
exservice = input("Ex-service men (Yes/No): ")
disability = input("Disability (Yes/No): ")
sports = input("Sports (Yes/No): ")
percentage = input("Annual percentage: ")
income = input("Income: ")
india = input("India (In/Out): ")


# ---------------------------------------------------------
# 3. CREATE STUDENT DATAFRAME
# ---------------------------------------------------------

student = pd.DataFrame({
    "education_qualification": [education],
    "gender": [gender],
    "community": [community],
    "religion": [religion],
    "exservice_men": [exservice],
    "disability": [disability],
    "sports": [sports],
    "annual_percentage": [percentage],
    "income": [income],
    "india": [india]
})


# ---------------------------------------------------------
# 4. SELECT ELIGIBLE SCHOLARSHIP RECORDS
# ---------------------------------------------------------

eligible_scholarships = df[
    df["outcome"] == 1
].copy()


# ---------------------------------------------------------
# 5. FEATURES USED FOR MATCHING
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# 6. CALCULATE MATCH SCORE
# ---------------------------------------------------------

eligible_scholarships["match_score"] = 0

student_values = student.iloc[0]

for feature in features:

    student_value = str(
        student_values[feature]
    ).strip().lower()

    scholarship_value = (
        eligible_scholarships[feature]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    eligible_scholarships["match_score"] += (
        scholarship_value == student_value
    ).astype(int)


# ---------------------------------------------------------
# 7. SORT SCHOLARSHIPS
# ---------------------------------------------------------

eligible_scholarships = (
    eligible_scholarships
    .sort_values(
        "match_score",
        ascending=False
    )
)


# ---------------------------------------------------------
# 8. REMOVE DUPLICATE SCHOLARSHIPS
# ---------------------------------------------------------

eligible_scholarships = (
    eligible_scholarships
    .drop_duplicates(
        subset=["name"]
    )
)


# ---------------------------------------------------------
# 9. GET TOP 5 SCHOLARSHIPS
# ---------------------------------------------------------

top_scholarships = (
    eligible_scholarships
    .head(5)
)


# ---------------------------------------------------------
# 10. DISPLAY RECOMMENDATIONS
# ---------------------------------------------------------

print("\n======================================")
print("RECOMMENDED SCHOLARSHIPS")
print("======================================")

if len(top_scholarships) > 0:

    for i, row in enumerate(
        top_scholarships.itertuples(),
        start=1
    ):

        print(
            f"\n{i}. {row.name}"
        )

        print(
            f"   Match Score: "
            f"{row.match_score}/10"
        )

else:

    print("\nNo suitable scholarships found.")

