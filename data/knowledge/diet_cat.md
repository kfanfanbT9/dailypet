---
source: dailypet_knowledge/diet_cat
title: 고양이 식단·급여 근거 설명
species: cat
category: diet
updated: 2026-11-04
reviewed: false
sources:
  - https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals
  - https://www.merckvetmanual.com/cat-owners/selecting-and-providing-a-home-for-a-cat/proper-nutrition-for-cats
  - https://www.vet.cornell.edu/departments/cornell-feline-health-center/health-information/feline-health-topics/how-often-should-you-feed-your-cat
  - https://icatcare.org/articles/feeding-your-cat-or-kitten
  - https://icatcare.org/resources/cat-carer-guide-encouraging-your-cat-to-drink.pdf
  - https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/kittens-cats/the-best-diet-for-your-cat-1
  - https://vcahospitals.com/know-your-pet/nutrition-feeding-guidelines-for-cats
  - https://vcahospitals.com/pediatric/kitten/nutrition/can-cats-be-vegan-or-vegetarian
  - https://vcahospitals.com/know-your-pet/feeding-mature-senior-and-geriatric-cats
  - https://vcahospitals.com/know-your-pet/creating-a-weight-reduction-plan-for-cats
  - https://vcahospitals.com/know-your-pet/tips-for-successful-weight-loss-in-dogs-and-cats
  - https://wsava.org/wp-content/uploads/2025/11/WSAVA_GuidetoTreats_Cats_251107.pdf
  - https://wsava.org/wp-content/uploads/2021/04/Raw-Meat-Based-Diets-for-Pets_WSAVA-Global-Nutrition-Toolkit.pdf
  - https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/poisons
  - https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets
---

# 고양이 식단·급여 근거 설명

이 문서는 DailyPet 식단 카탈로그(`data/catalog/diets.json`)의 고양이 항목이 왜 추천되는지와 주의할 점을 정리한 참고 자료다. 출처 원문을 요약한 일반 정보이며 수의사의 진료·처방을 대신하지 않는다. 질환이 있거나 처방식을 먹는 고양이는 식단을 바꾸기 전에 담당 수의사와 상의한다.

## 1. 고양이는 완전 육식동물

- `diet_cat_carnivore_basics_01` 기본 급여 원칙: 고양이는 고기를 먹어야 하는 **완전 육식동물**이다. 타우린, 아라키돈산, 비타민 A 같은 영양소를 동물성 원료에서 얻어야 한다. 타우린이 부족하면 실명이나 심장 근육 약화가 생길 수 있어 채식·비건 식단은 권장되지 않는다(Cornell·VCA·Merck).
- 연령에 맞는 **완전·균형 고양이 사료**를 주식으로 한다. 개 사료는 고양이에게 필요한 영양소 구성이 달라 주식으로 쓰지 않는다.
- 수제식은 수의 영양 전문가와 상담한 뒤에만 고려한다. 생고기 식단은 세균·기생충 위험이 있다(WSAVA).

## 2. 하루 필요 칼로리 계산의 기준

- **RER** = `70 × 체중(kg)^0.75` (Merck).
- Merck 표의 고양이 유지 에너지 계수:
  - 중성화하지 않은 성묘: RER × 1.4
  - 중성화한 성묘: RER × 1.2
  - 살이 잘 찌는 성묘: RER × 1.0
  - 새끼 고양이: RER × 2.5 (자율 급여도 가능)
- 예: 4kg 중성화 성묘의 RER은 약 70 × 4^0.75 ≈ 198kcal, 하루 약 238kcal가 출발점이다.
- 계산값과 사료 포장지 급여량은 출발점일 뿐이다. 체중과 체형 점수(BCS)를 보며 조정한다.

## 3. 생활 단계별 급여 원칙

### 새끼 고양이 (12개월 미만)
- `diet_cat_kitten_meal_guide_01` 하루 급여 횟수: 젖을 뗀 새끼 고양이는 위가 작아 여러 번 나눠 먹어야 한다. 4개월 미만은 하루 3~4회, 6개월까지 하루 3회, 6~12개월은 하루 2회 정도가 일반적이다(Cornell·Merck).
- `diet_cat_kitten_growth_food_01` 성장기 사료 유지: 이유는 보통 생후 3~4주에 시작해 8주 무렵 끝난다. 약 9~12개월까지 성장기(키튼) 사료를 유지한다. 사료는 약 2주에 걸쳐 서서히 바꾼다. 어릴 때 습식·건식을 모두 경험시키면 나중에 식감 적응이 쉽다(iCatCare·PDSA).
- `diet_cat_kitten_water_not_milk_01` 우유 대신 물: 이유한 고양이는 우유가 필요 없다. 생후 약 12주 무렵부터 유당 소화 능력이 줄어 우유가 설사를 일으킬 수 있으므로 깨끗한 물을 항상 준다. 어미를 잃은 신생 고양이는 전용 대용유를 수의사 지도 아래 쓴다.

### 성묘
- `diet_cat_adult_meal_guide_01` 정량 소량 다회 급여: 고양이는 원래 하루에 여러 번 조금씩 먹는다. 아침에 하루 양을 계량해 두고 최소 2회, 가능하면 여러 번으로 나눠 주면 과식을 줄일 수 있다. 습식 사료는 오래 두면 상하므로 남은 것은 치운다.
- `diet_cat_puzzle_feeder_01` 퍼즐 피더 급여: 하루 사료 일부를 퍼즐 피더나 스너플 매트에 넣으면 사냥하듯 먹으며 식사 시간이 길어지고 활동량이 늘어 체중 관리에 도움이 된다. 쉬운 단계부터 시작하고 총 급여량은 그대로 유지한다.

### 노령묘 (7세 이상)
- `diet_cat_senior_meal_guide_01` 노령묘 급여 가이드: 노령 초기에는 필요 칼로리가 줄지만, 약 11세 이후에는 소화 효율이 떨어져 오히려 칼로리·단백질이 더 필요할 수 있다(VCA). 하루 양을 2~4회로 나누고 체중과 근육량을 정기적으로 확인한다. **체중 감소는 질환의 첫 신호일 수 있어** 진료를 권한다.
- `diet_cat_senior_hydration_01` 노령묘 수분·식사 편의: 갈증을 덜 느껴 탈수되기 쉽다. 물그릇을 여러 곳에 두고 습식 비율을 늘린다. 관절이 불편한 고양이는 약간 높인 그릇이 편할 수 있다. 치아 통증으로 식욕이 줄 수 있으니 구강 검진을 받는다.

## 4. 물 마시기

고양이는 물을 적게 마시는 경향이 있어 수분 관리가 특히 중요하다.

- `diet_cat_wet_food_hydration_01` 습식 사료로 수분 보충: 습식 사료는 수분이 약 70~80%로 건사료보다 훨씬 많다. 물을 잘 안 마시는 고양이는 습식을 섞거나 일부 대체한다. 습식은 g당 칼로리가 낮아 급여량(g)을 다시 계산한다. 하부 요로 질환 이력이 있으면 수의사와 상의한다.
- `diet_cat_water_bowls_01` 물그릇 배치: 수염이 닿지 않는 넓고 얕은 유리·도자기 그릇을 가득 채워 준다. 물그릇은 고양이 수보다 하나 더 많이, 층마다 두고, 화장실과 밥그릇 바로 옆은 피한다(iCatCare). 주사기로 억지로 물을 먹이지 않는다.
- `diet_cat_water_fountain_01` 급수기 활용: 흐르는 물을 좋아하는 고양이는 분수형 급수기로 더 많이 마실 수 있다. 처음에는 전원을 끈 채로 익숙해지게 하고, 필터와 본체를 정기적으로 세척한다.
- 음수량이 갑자기 늘면 당뇨, 신장병, 갑상선 질환의 신호일 수 있으므로 동물병원 상담을 권한다.

## 5. 간식과 토핑: 10% 규칙

- `diet_cat_treat_rule_01` 고양이 간식 10% 규칙: 간식과 사람 음식은 모두 하루 칼로리에 포함되며 **하루 칼로리의 10% 이내**로 제한한다. WSAVA 기준 건강한 성묘의 하루 간식 허용량은 3kg 약 20kcal, 4kg 약 22kcal, 5kg 약 25kcal 정도다. 시판 고양이 간식은 1개에 1~4kcal 정도라 개수를 세어 관리한다(VCA). 이 표 수치는 검수 단계에서 원문 대조가 필요하다.
- `diet_cat_chicken_topping_01` 삶은 닭가슴살 토핑: 껍질·뼈·양념을 뺀 익힌 닭가슴살은 건강한 간식이다. 다만 28g에 약 47kcal(WSAVA)로 많은 고양이의 하루 간식 허용량을 넘으므로 몇 조각만 준다. **닭고기 알레르기가 있는 고양이에게는 주지 않는다.**
- `diet_cat_cooked_fish_topping_01` 익힌 흰살생선·연어 토핑: 가시를 빼고 양념 없이 **익힌** 생선만 가끔 준다. 익힌 연어 28g 약 39kcal(WSAVA). 기름·소금에 절인 통조림은 피한다. **생선 알레르기가 있으면 주지 않는다.**
- 간식이 식사를 대신하면 안 된다. 뼈나 날 동물성 간식은 피한다.

## 6. 체중 감량

- `diet_cat_weight_loss_plan_01` 고양이 체중 감량 급여 계획: 비만 고양이는 수의사 감독 아래 **주당 초기 체중의 1~2%**(고도 비만은 약 0.5%) 정도로 천천히 뺀다. 최소 2주마다 체중을 확인한다(VCA).
- **고양이를 굶기거나 급격히 줄이면 안 된다.** 너무 빨리 빼면 지방간(간 지질증)과 근육 손실 위험이 있다. 식욕이 하루 이상 없으면 즉시 동물병원에 간다.

## 7. 절대 주면 안 되는 음식 (추천 대상 아님)

아래 항목은 `recommendable: false`인 **정보 제공용 경고**다. 먹었다면 먹은 양과 시간을 기록하고 **즉시 동물병원에 연락하거나 내원한다.**

- `diet_cat_onion_garlic_harmful_01` 양파·마늘·파·부추류: 적혈구를 손상시켜 빈혈을 일으키며 **고양이는 개보다 더 민감하다.** 양념한 고기·국물도 주지 않는다.
- `diet_cat_chocolate_harmful_01` 초콜릿, `diet_cat_caffeine_harmful_01` 카페인 음료: 메틸잔틴 성분이 구토, 부정맥, 떨림, 발작을 일으킬 수 있다.
- `diet_cat_alcohol_harmful_01` 알코올, `diet_cat_raw_dough_harmful_01` 생 빵 반죽.
- `diet_cat_grape_raisin_harmful_01` 포도·건포도, `diet_cat_xylitol_harmful_01` 자일리톨: 고양이에서도 유해 식품으로 분류된다.
- `diet_cat_milk_dairy_harmful_01` 우유·유제품: 많은 고양이가 유당을 잘 소화하지 못해 설사가 생길 수 있다. 우유를 간식으로 주지 않는다.
- `diet_cat_raw_fish_harmful_01` 날 민물고기·날생선: 티아민(비타민 B1)을 파괴하는 효소가 있어 계속 먹으면 티아민 결핍이 생길 수 있고, 세균·기생충 위험도 있다. 생선은 반드시 익힌다.
- `diet_cat_bones_harmful_01` 익힌 뼈·날뼈: 입·식도·장에 상처나 막힘을 일으킬 수 있다.
