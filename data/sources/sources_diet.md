# 식단(Diet) 카탈로그 출처 목록

- 대상 파일: `data/catalog/diets.json` (개 15+유해 10, 고양이 15+유해 10, 총 50개)
- 확인일: 2026-11-04 / 작성: Claude 웹 검색 초안 / 모든 항목 `reviewed: false`
- 원칙: 아래 URL은 모두 실제로 열람(WebFetch)했거나 열람한 WSAVA 페이지의 링크 목록에서 확인한 것만 기록. 블로그·광고·특정 브랜드 자료는 제외.

## 1. 검색 질의

1. ASPCA people foods to avoid feeding your pets
2. Tufts Petfoodology treats 10 percent rule calories
3. Cornell Feline Health Center feeding your cat nutrition taurine obligate carnivore
4. VCA hospitals feeding puppies how often per day
5. WSAVA global nutrition guidelines toolkit
6. feeding growing puppy meals per day large breed calcium (도메인 제한: vcahospitals.com, merckvetmanual.com, pdsa.org.uk, aaha.org)
7. feeding kittens how often per day (도메인 제한: vcahospitals.com, vet.cornell.edu, merckvetmanual.com, pdsa.org.uk)
8. cat water intake wet food hydration fountain (도메인 제한: vcahospitals.com, vet.cornell.edu, pdsa.org.uk, icatcare.org)
9. senior dog nutrition feeding older dogs (도메인 제한: vcahospitals.com, merckvetmanual.com, pdsa.org.uk, aaha.org)
10. cats obligate carnivores taurine vegetarian diet (도메인 제한: vet.cornell.edu, vcahospitals.com, petfoodology.org, vetnutrition.tufts.edu, icatcare.org)
11. weight loss program dogs cats calorie restriction rate of weight loss per week (도메인 제한: vcahospitals.com, aaha.org, vet.cornell.edu, merckvetmanual.com, pdsa.org.uk)
12. feeding senior cats nutrition older cats weight loss muscle (도메인 제한)
13. what fruit and vegetables can dogs eat safely carrots apples blueberries (도메인 제한: pdsa.org.uk, vcahospitals.com, aspca.org, rspca.org.uk, bluecross.org.uk)
14. dog water intake how much should dog drink per day (도메인 제한)
15. human foods poisonous to cats onion chocolate raw fish thiamine (도메인 제한)
16. 반려견 먹으면 안되는 음식 포도 초콜릿 양파 자일리톨 농림축산식품부

## 2. 출처 (항목 매핑)

| # | 제목 | 기관 | URL | 근거 item_id |
|---|------|------|-----|--------------|
| 1 | People Foods to Avoid Feeding Your Pets | ASPCA Animal Poison Control Center | https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets | `diet_dog_chocolate_harmful_01`, `diet_dog_grape_raisin_harmful_01`, `diet_dog_xylitol_harmful_01`, `diet_dog_onion_garlic_harmful_01`, `diet_dog_macadamia_harmful_01`, `diet_dog_alcohol_harmful_01`, `diet_dog_raw_dough_harmful_01`, `diet_dog_caffeine_harmful_01`, `diet_dog_bones_harmful_01`, `diet_dog_salty_fatty_food_harmful_01`, `diet_cat_onion_garlic_harmful_01`, `diet_cat_chocolate_harmful_01`, `diet_cat_caffeine_harmful_01`, `diet_cat_alcohol_harmful_01`, `diet_cat_raw_dough_harmful_01`, `diet_cat_xylitol_harmful_01`, `diet_cat_milk_dairy_harmful_01` |
| 2 | Sharing is Caring: Foods You Can Safely Share with Your Pet | ASPCA | https://www.aspca.org/news/sharing-caring-foods-you-can-safely-share-your-pet | `diet_dog_chicken_topping_01`, `diet_dog_carrot_treat_01`, `diet_dog_green_bean_treat_01`, `diet_dog_fruit_treat_01`, `diet_dog_pumpkin_topping_01`, `diet_dog_xylitol_harmful_01`, `diet_dog_salty_fatty_food_harmful_01` |
| 3 | How often should you feed your cat? | Cornell Feline Health Center | https://www.vet.cornell.edu/departments/cornell-feline-health-center/health-information/feline-health-topics/how-often-should-you-feed-your-cat | `diet_cat_kitten_meal_guide_01`, `diet_cat_adult_meal_guide_01`, `diet_cat_wet_food_hydration_01` |
| 4 | Poisons | Cornell Feline Health Center | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/poisons | `diet_cat_chocolate_harmful_01`, `diet_cat_grape_raisin_harmful_01`, `diet_cat_xylitol_harmful_01` |
| 5 | Encouraging your cat to drink: a guide for caregivers | International Cat Care | https://icatcare.org/resources/cat-carer-guide-encouraging-your-cat-to-drink.pdf | `diet_cat_water_bowls_01`, `diet_cat_water_fountain_01`, `diet_cat_senior_hydration_01` |
| 6 | Feeding your cat or kitten | International Cat Care | https://icatcare.org/articles/feeding-your-cat-or-kitten | `diet_cat_kitten_growth_food_01`, `diet_cat_carnivore_basics_01`, `diet_cat_adult_meal_guide_01`, `diet_cat_puzzle_feeder_01` |
| 7 | Proper Nutrition for Cats | Merck Veterinary Manual (Cat Owners) | https://www.merckvetmanual.com/cat-owners/selecting-and-providing-a-home-for-a-cat/proper-nutrition-for-cats | `diet_cat_kitten_meal_guide_01`, `diet_cat_kitten_growth_food_01`, `diet_cat_carnivore_basics_01`, `diet_cat_adult_meal_guide_01`, `diet_cat_water_bowls_01`, `diet_cat_water_fountain_01`, `diet_cat_milk_dairy_harmful_01` |
| 8 | Nutritional Requirements of Small Animals | Merck Veterinary Manual | https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals | `diet_dog_hydration_01`, `diet_cat_carnivore_basics_01`, `diet_cat_cooked_fish_topping_01`, `diet_cat_raw_fish_harmful_01` |
| 9 | Safe fruit and veg for dogs | PDSA | https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/safe-fruit-and-veg-for-dogs | `diet_dog_carrot_treat_01`, `diet_dog_green_bean_treat_01`, `diet_dog_fruit_treat_01`, `diet_dog_grape_raisin_harmful_01`, `diet_dog_onion_garlic_harmful_01` |
| 10 | The best diet for your cat | PDSA | https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/kittens-cats/the-best-diet-for-your-cat-1 | `diet_cat_kitten_growth_food_01`, `diet_cat_kitten_water_not_milk_01`, `diet_cat_adult_meal_guide_01`, `diet_cat_chicken_topping_01`, `diet_cat_cooked_fish_topping_01`, `diet_cat_wet_food_hydration_01`, `diet_cat_onion_garlic_harmful_01`, `diet_cat_grape_raisin_harmful_01`, `diet_cat_milk_dairy_harmful_01` |
| 11 | Can you feed pets certain fruits and veggies | VCA Animal Hospitals | https://vcahospitals.com/resources/preventive-dog/nutrition/can-you-feed-pets-certain-fruits-and-veggies | `diet_dog_fruit_treat_01` |
| 12 | Creating a Weight Reduction Plan for Cats | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/creating-a-weight-reduction-plan-for-cats | `diet_cat_puzzle_feeder_01`, `diet_cat_treat_rule_01`, `diet_cat_weight_loss_plan_01` |
| 13 | Feeding Growing Puppies | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/feeding-growing-puppies | `diet_dog_puppy_meal_guide_01`, `diet_dog_large_breed_puppy_01`, `diet_dog_training_treat_01` |
| 14 | Feeding Mature and Senior Dogs | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/feeding-mature-and-senior-dogs | `diet_dog_carrot_treat_01`, `diet_dog_green_bean_treat_01`, `diet_dog_hydration_01`, `diet_dog_senior_hydration_01`, `diet_dog_senior_meal_guide_01` |
| 15 | Feeding Mature, Senior, and Geriatric Cats | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/feeding-mature-senior-and-geriatric-cats | `diet_cat_water_fountain_01`, `diet_cat_senior_meal_guide_01`, `diet_cat_senior_hydration_01` |
| 16 | Feeding Times and Frequency for Your Dog | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/feeding-times-and-frequency-for-your-dog | `diet_dog_puppy_meal_guide_01`, `diet_dog_adult_meal_guide_01` |
| 17 | Feeding Tips for Senior Dogs and Cats | VCA Animal Hospitals | https://vcahospitals.com/resources/senior/top-tips-for-feeding-your-senior-pet | `diet_dog_senior_hydration_01`, `diet_dog_senior_meal_guide_01`, `diet_dog_senior_soft_food_01`, `diet_cat_senior_meal_guide_01`, `diet_cat_senior_hydration_01` |
| 18 | Nutrition - General Feeding Guidelines for Cats | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/nutrition-feeding-guidelines-for-cats | `diet_cat_kitten_growth_food_01`, `diet_cat_kitten_water_not_milk_01`, `diet_cat_carnivore_basics_01`, `diet_cat_wet_food_hydration_01` |
| 19 | Nutritional Considerations for Large and Giant Breed Dogs | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/nutritional-considerations-for-large-and-giant-breed-dogs | `diet_dog_large_breed_puppy_01` |
| 20 | Tips for Successful Weight Loss in Dogs and Cats | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/tips-for-successful-weight-loss-in-dogs-and-cats | `diet_dog_training_treat_01`, `diet_dog_treat_rule_01`, `diet_dog_weight_loss_plan_01`, `diet_cat_treat_rule_01`, `diet_cat_weight_loss_plan_01` |
| 21 | Why Your Kitten Can't Be Vegan Or Vegetarian | VCA Animal Hospitals | https://vcahospitals.com/pediatric/kitten/nutrition/can-cats-be-vegan-or-vegetarian | `diet_cat_carnivore_basics_01` |
| 22 | Feeding treats to your cat | WSAVA Global Nutrition Committee | https://wsava.org/wp-content/uploads/2025/11/WSAVA_GuidetoTreats_Cats_251107.pdf | `diet_cat_treat_rule_01`, `diet_cat_chicken_topping_01`, `diet_cat_cooked_fish_topping_01`, `diet_cat_onion_garlic_harmful_01`, `diet_cat_chocolate_harmful_01`, `diet_cat_caffeine_harmful_01`, `diet_cat_alcohol_harmful_01`, `diet_cat_raw_dough_harmful_01`, `diet_cat_grape_raisin_harmful_01`, `diet_cat_xylitol_harmful_01`, `diet_cat_milk_dairy_harmful_01`, `diet_cat_raw_fish_harmful_01`, `diet_cat_bones_harmful_01` |
| 23 | Feeding treats to your dog | WSAVA Global Nutrition Committee | https://wsava.org/wp-content/uploads/2025/11/WSAVA_GuidetoTreats_Dogs_251107.pdf | `diet_dog_training_treat_01`, `diet_dog_treat_rule_01`, `diet_dog_chicken_topping_01`, `diet_dog_chocolate_harmful_01`, `diet_dog_grape_raisin_harmful_01`, `diet_dog_xylitol_harmful_01`, `diet_dog_onion_garlic_harmful_01`, `diet_dog_macadamia_harmful_01`, `diet_dog_alcohol_harmful_01`, `diet_dog_raw_dough_harmful_01`, `diet_dog_caffeine_harmful_01`, `diet_dog_bones_harmful_01` |
| 24 | Raw Meat Based Diets for Pets | WSAVA Global Nutrition Committee | https://wsava.org/wp-content/uploads/2021/04/Raw-Meat-Based-Diets-for-Pets_WSAVA-Global-Nutrition-Toolkit.pdf | `diet_dog_bones_harmful_01`, `diet_cat_carnivore_basics_01`, `diet_cat_raw_fish_harmful_01`, `diet_cat_bones_harmful_01` |
| 25 | Global Nutrition Guidelines (Nutrition Toolkit) | WSAVA | https://wsava.org/global-guidelines/global-nutrition-guidelines/ | `diet_dog_adult_meal_guide_01`, `diet_dog_weight_loss_plan_01`, `diet_cat_weight_loss_plan_01` |

## 3. 검토·제외 메모

- WSAVA 'Feeding treats to your dog' PDF의 체중별 간식 허용 kcal 표는 텍스트 추출 결과가 깨져(동일 값 반복) 카탈로그에 사용하지 않음. 식품별 kcal 표만 사용.
- WSAVA 'Feeding treats to your cat' 체중별 표(2.5kg 18kcal ~ 7kg 28kcal)는 PDF 텍스트 추출값으로, 원문 표와 대조 필요.
- AAHA 2021 Nutrition & Weight Management / 2023 Senior Care 가이드라인 웹페이지는 403으로 열람하지 못해 인용하지 않음.
- Merck 'Feeding Practices in Small Animals'(퍼피 급여 횟수)는 검색 요약만 보고 본문을 열람하지 않아 인용하지 않음.
- Tufts Petfoodology 페이지는 검색에서 직접 확인되지 않아 인용하지 않음.
- 한국 정부·대한수의사회 자료는 검색에서 찾지 못함(언론·브랜드 자료만 확인되어 제외). 검수 단계에서 국내 출처 보강 권장.
- ASPCA 'Sharing is Caring'은 간식 5% 이내를 권고해 WSAVA·VCA의 10%와 다름. 카탈로그는 10% 기준을 사용.
- 아보카도·감귤·코코넛은 ASPCA상 개·고양이에 대한 위험이 경미하거나 주로 다른 동물 대상이라 유해 목록에서 제외.
