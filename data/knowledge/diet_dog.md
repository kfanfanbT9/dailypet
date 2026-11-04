---
source: dailypet_knowledge/diet_dog
title: 개 식단·급여 근거 설명
species: dog
category: diet
updated: 2026-11-04
reviewed: false
sources:
  - https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals
  - https://vcahospitals.com/know-your-pet/feeding-growing-puppies
  - https://vcahospitals.com/know-your-pet/feeding-times-and-frequency-for-your-dog
  - https://vcahospitals.com/know-your-pet/nutritional-considerations-for-large-and-giant-breed-dogs
  - https://vcahospitals.com/know-your-pet/feeding-mature-and-senior-dogs
  - https://vcahospitals.com/resources/senior/top-tips-for-feeding-your-senior-pet
  - https://vcahospitals.com/know-your-pet/tips-for-successful-weight-loss-in-dogs-and-cats
  - https://wsava.org/wp-content/uploads/2025/11/WSAVA_GuidetoTreats_Dogs_251107.pdf
  - https://wsava.org/global-guidelines/global-nutrition-guidelines/
  - https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/safe-fruit-and-veg-for-dogs
  - https://www.aspca.org/news/sharing-caring-foods-you-can-safely-share-your-pet
  - https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets
---

# 개 식단·급여 근거 설명

이 문서는 DailyPet 식단 카탈로그(`data/catalog/diets.json`)의 개 항목이 왜 추천되는지, 어떤 개에게 맞는지, 무엇을 조심해야 하는지를 정리한 참고 자료다. 출처 원문을 요약한 일반 정보이며 수의사의 진료·처방을 대신하지 않는다. 질환이 있거나 처방식을 먹는 개는 식단을 바꾸기 전에 담당 수의사와 상의한다.

## 1. 하루 필요 칼로리 계산의 기준

- **휴식기 에너지 요구량(RER)**: `RER = 70 × 체중(kg)^0.75` (Merck Veterinary Manual). 체중이 2~45kg이면 `30 × 체중 + 70`의 직선식도 근삿값으로 쓰인다.
- **하루 유지 에너지(DER/MER)**는 RER에 생활 단계별 계수를 곱한다. Merck 표의 개 계수는 다음과 같다.
  - 중성화하지 않은 성견: RER × 1.8
  - 중성화한 성견: RER × 1.6
  - 살이 잘 찌는 성견: RER × 1.4
  - 4개월 미만 강아지: RER × 3.0
  - 4개월 이상 강아지(성장기): RER × 2.0
- 예: 33.2kg 개의 RER은 약 70 × 33.2^0.75 ≈ 968kcal다. 중성화한 성견이면 하루 약 1,550kcal가 출발점이 된다.
- 체중 감량 중일 때 DailyPet 계산 도구는 **목표 체중 기준 RER × 1.0**을 출발점으로 보여 준다. 이 값은 앱의 기본 계산값이며, 실제 감량 목표 칼로리는 수의사와 함께 정한다.
- 계산값은 출발점일 뿐이다. 사료 포장지 급여량도 마찬가지로, 2~4주마다 체중과 체형 점수(BCS)를 확인하며 조정한다.

## 2. 생활 단계별 급여 원칙

### 어린 강아지 (12개월 미만)
- `diet_dog_puppy_meal_guide_01` 강아지 하루 급여 횟수: 위가 작아 하루 양을 3~4회로 나눠 주고, 자라면서 2~3회로 줄인다. 사료를 늘 놓아두는 자율 급여는 비만과 골격 문제 위험이 있어 정해진 시간에 계량해 준다(VCA). 식후 10~15분 안에 배변하는 경우가 많아 배변 훈련과 함께 계획하면 좋다.
- `diet_dog_large_breed_puppy_01` 대형견 강아지 성장기 급여: 대형·초대형견은 너무 빨리 자라면 뼈 발달에 문제가 생길 수 있다. 칼슘·인이 조절된 대형견 성장기 사료를 하루 여러 번 소량씩 주고, 대형견은 약 18개월·초대형견은 약 24개월까지 성장기 사료를 유지한다. 약간 마른 체형(BCS 4/9)이 권장되며, 칼슘·비타민 보충제는 수의사 권고 없이 주지 않는다. 식사 전후의 격한 운동은 피한다.
- 성장기에는 반드시 성장기용(또는 전 연령용) 완전·균형 사료를 주식으로 쓴다.

### 성견
- `diet_dog_adult_meal_guide_01` 성견 하루 2회 정량 급여: 하루 최소 두 번, 정해진 시간에 계량해 준다. 자율 급여는 비만·폭식과 관련이 있어 권장되지 않는다. 남긴 양을 기록해 두면 식욕 변화를 빨리 알아챌 수 있다.

### 노령견 (7세 이상, 대형견은 6세 이상)
- `diet_dog_senior_meal_guide_01` 노령견 급여 가이드: 나이가 들면 활동량과 필요 칼로리가 줄어 같은 양을 먹어도 살이 찌기 쉽다. 반대로 아주 나이 든 개는 칼로리·단백질이 더 필요할 수도 있어, 하루 양을 2~4회로 나누고 체중과 근육 상태를 정기적으로 본다. 식욕이 줄면 질환 신호일 수 있으니 진료를 받는다.
- `diet_dog_senior_soft_food_01` 부드러운 식사: 잇몸과 치아가 예민한 노령견은 딱딱한 사료를 꺼릴 수 있다. 습식 사료로 일부 또는 전부 바꾸되 총 칼로리는 같게 유지하고, 칼로리 밀도가 다르므로 급여량(g)을 다시 계산한다.
- `diet_dog_senior_hydration_01` 노령견 수분 보충: 갈증을 덜 느껴 탈수되기 쉬우므로 집 안 여러 곳에 물그릇을 둔다. 신장·심장 질환이 있으면 식단 변경 전에 수의사와 상의한다.

## 3. 간식과 토핑: 10% 규칙

- `diet_dog_treat_rule_01` 간식 10% 규칙: 간식, 씹는 간식, 사람 음식을 모두 합쳐 **하루 칼로리의 10% 이내**로 한다(WSAVA·VCA). 간식을 준 날은 사료를 그만큼 줄인다. ASPCA는 5% 이내를 권하기도 해 출처마다 차이가 있으며, DailyPet은 10%를 기준으로 쓴다.
- 칼로리 감을 잡기 위한 WSAVA 표의 예: 저지방 소고기 28g 약 64kcal, 땅콩버터 1큰술 약 81kcal, 체다치즈 28g 약 120kcal, 큰 소가죽 껌 하나는 수백 kcal에 이른다.
- `diet_dog_training_treat_01` 훈련용 간식: 훈련 보상도 하루 칼로리에 들어간다. 아주 작게 자른 저칼로리 간식(1개 15kcal 미만, VCA 기준)이나 하루 사료 일부를 보상으로 쓴다. 자일리톨이 든 땅콩버터 같은 사람 음식은 쓰지 않는다.
- `diet_dog_chicken_topping_01` 삶은 닭가슴살 토핑: 껍질·뼈·양념(소금, 양파, 마늘)을 뺀 익힌 닭가슴살은 저지방 단백질 토핑이다. 28g에 약 47kcal(WSAVA)라 소량만 준다. **닭고기 알레르기가 있는 개에게는 주지 않는다.**
- `diet_dog_carrot_treat_01` 당근 간식: 생으로도 익혀서도 줄 수 있는 저칼로리 채소다. 목에 걸리지 않게 작게 자른다.
- `diet_dog_green_bean_treat_01` 그린빈 간식: 양념 없는 그린빈은 칼로리가 낮아 체중 관리 중인 개의 간식으로 쓰인다. 통조림은 염분을 확인한다. 간식 몫 안에서만 주고, 식사를 대신할 만큼 많이 주지 않는다.
- `diet_dog_fruit_treat_01` 사과·블루베리 과일 간식: 씨와 심을 뺀 사과, 블루베리는 가끔 주는 간식으로 괜찮다. 과일은 당이 많아 아주 조금만 준다. **당뇨가 있는 개에게는 권하지 않는다.** 포도·건포도는 절대 안 된다.
- `diet_dog_pumpkin_topping_01` 익힌 호박 토핑: 설탕·향신료 없는 익힌 호박을 1~2숟가락 이내로 얹는다. 호박파이 필링 제품은 쓰지 않는다.
- 새 음식은 한 번에 한 가지씩 소량으로 시작하고 설사·구토 같은 반응을 관찰한다.

## 4. 물

- `diet_dog_hydration_01` 신선한 물 상시 제공: 물은 가장 중요한 영양소다(Merck). 깨끗한 물을 항상 마실 수 있게 하고 그릇은 매일 씻는다. 수의사 지시 없이 물을 제한하지 않는다.
- 평소보다 물을 갑자기 많이 마시면 질환 신호일 수 있으므로 동물병원 상담을 권한다.

## 5. 체중 감량

- `diet_dog_weight_loss_plan_01` 체중 감량 급여 계획: 과체중 개는 수의사와 목표 칼로리를 정한 뒤 **주당 체중의 0.5~2%** 정도로 천천히 뺀다(VCA). 사료는 계량컵보다 주방 저울로 재고, 2주마다 체중을 확인한다.
- 일반 사료를 임의로 크게 줄이면 필수 영양소가 부족해질 수 있다. 감량 전용 식단이 필요한지는 수의사가 판단한다.
- 감량 중에도 간식은 하루 칼로리 안에 포함한다. 체중, BCS, 사진으로 진행 상황을 기록하면 도움이 된다.
- 운동은 관절 부담이 적은 항목부터 늘린다 (활동 문서 참고).

## 6. 절대 주면 안 되는 음식 (추천 대상 아님)

아래 항목은 카탈로그에 `recommendable: false`로 들어 있는 **정보 제공용 경고**다. 어떤 경우에도 급여를 권하지 않는다. 먹었다면 먹은 양과 시간을 기록하고 **즉시 동물병원에 연락하거나 내원한다.** 집에서 구토를 유도하는 등의 처치는 하지 않는다.

- `diet_dog_chocolate_harmful_01` 초콜릿: 테오브로민·카페인이 구토, 설사, 흥분, 부정맥, 떨림, 발작을 일으킬 수 있다. 다크·제빵용 초콜릿과 코코아 가루가 가장 위험하다.
- `diet_dog_grape_raisin_harmful_01` 포도·건포도·커런트: 신장 손상을 일으킬 수 있다. 빵·과자에 든 건포도도 포함되며 소량도 금지다.
- `diet_dog_xylitol_harmful_01` 자일리톨: 껌, 사탕, 치약, 일부 땅콩버터에 든 감미료로 저혈당과 간 손상을 일으킬 수 있다. 사람 음식은 성분표를 확인한다.
- `diet_dog_onion_garlic_harmful_01` 양파·마늘·파·부추류: 적혈구를 손상시켜 빈혈을 일으킬 수 있다. 가루나 양념, 국물에 섞인 형태도 위험하다.
- `diet_dog_macadamia_harmful_01` 마카다미아 너트: 무기력, 비틀거림, 구토, 떨림, 고체온을 일으킬 수 있다.
- `diet_dog_alcohol_harmful_01` 알코올, `diet_dog_raw_dough_harmful_01` 생 빵 반죽, `diet_dog_caffeine_harmful_01` 커피·차·에너지 음료.
- `diet_dog_bones_harmful_01` 익힌 뼈·날뼈: 치아 골절, 식도·장 막힘을 일으킬 수 있다.
- `diet_dog_salty_fatty_food_harmful_01` 짠 음식·기름진 사람 음식: 염분 과다와 췌장염 위험이 있어 식탁 음식과 남은 음식은 주지 않는다.
