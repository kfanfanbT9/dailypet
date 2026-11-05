---
source: dailypet_knowledge/activity_cat
title: 고양이 활동·놀이 근거 설명
species: cat
category: activity
updated: 2026-11-04
reviewed: true
sources:
  - https://icatcare.org/articles/playing-with-your-cat
  - https://icatcare.org/articles/special-considerations-for-senior-cats
  - https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/kittens-cats/exercise-for-your-cat
  - https://vcahospitals.com/know-your-pet/cat-behavior-and-training---enrichment-for-indoor-cats
  - https://vcahospitals.com/know-your-pet/cat-behavior-and-training---play-and-play-toys
  - https://vcahospitals.com/resources/preventive-cat/weight-exercise/you-can-exercise-your-cat-too
  - https://vcahospitals.com/pediatric/kitten/prep-supplies/how-to-make-vertical-space-for-cats
  - https://vcahospitals.com/know-your-pet/enriching-your-pets-environment-with-their-food
  - https://vcahospitals.com/resources/preventive-dog/weight-exercise/fun-exercises-for-pets
  - https://indoorpet.osu.edu/cats/basic-indoor-cat-needs/toys
  - https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/loving-care-older-cats
  - https://www.aspca.org/news/clicker-training-has-cats-jumping-through-hoops
---

# 고양이 활동·놀이 근거 설명

이 문서는 DailyPet 활동 카탈로그(`data/catalog/activities.json`)의 고양이 항목을 고른 이유와 주의할 점을 정리한 참고 자료다. 출처를 요약한 일반 정보이며, 관절이 불편하거나 질환이 있는 고양이는 활동 수준을 수의사와 상의한다.

## 1. 고양이 운동의 기본: 사냥 놀이

- 고양이의 놀이는 사냥 행동(탐색 → 잠복 → 추격 → 덮치기 → 잡기)을 흉내 낸다. 놀이는 운동량을 늘리고 실내 생활의 지루함과 스트레스를 줄인다(iCatCare·VCA).
- 고양이는 오래 달리기보다 **짧고 강한 놀이를 여러 번** 하는 편이 맞다. 출처마다 권장 시간이 다르다.
  - PDSA: 하루 2회, 15~20분
  - VCA 놀이 페이지: 하루 여러 번, 10분씩
  - VCA 운동 페이지: 몇 시간마다 5~10분 (하루 약 30분)
  - iCatCare: 1분 정도의 강한 놀이로도 충분할 수 있음
- 카탈로그의 시간·빈도는 이런 범위를 바탕으로 한 **앱 기본값**이며, 고양이가 흥미를 잃으면 억지로 이어가지 않는다.
- 고양이는 새벽과 저녁에 활발하다. 이 시간에 놀아 주면 효과가 좋다.
- 고양이는 대부분 실내에서 생활하므로 카탈로그의 고양이 항목은 하네스 산책을 빼면 모두 **실내 활동**이다.

## 2. 연령대별 항목

### 새끼 고양이 (12개월 미만)
- `act_cat_kitten_short_play_01` 아기고양이 짧은 놀이 (2~10분, 하루 3~4회): 금방 지치므로 짧은 놀이를 자주 한다. 끝낼 때는 움직임을 서서히 줄이고 밥으로 관심을 옮기면 사람 발목을 덮치는 행동을 줄일 수 있다.
- **손이나 발로 놀아 주지 않는다.** 커서 사람을 공격하는 습관이 생길 수 있어 반드시 장난감을 쓴다.
- 털실, 리본, 끈, 모루는 삼킬 위험이 있어 피한다. 3개월 미만은 캣닢에 반응하지 않는 경우가 많다.
- `act_cat_cat_tree_climb_01` 캣타워 오르기, `act_cat_ball_chase_01` 공 쫓기도 어린 고양이와 성묘에게 맞는다.

### 모든 연령에 맞는 항목
- `act_cat_wand_hunt_01` 낚싯대 장난감 사냥 놀이 (중강도): 깃털이나 쥐 인형을 먹잇감처럼 불규칙하게 움직이고, **마지막에는 꼭 잡게 해 만족감을 준다.** 노령묘는 바닥 높이에서 천천히 움직여 준다.
- `act_cat_puzzle_feeder_01` 퍼즐 피더 급여 (저강도): 하루 사료 일부를 퍼즐 피더, 달걀판, 휴지심에 넣어 꺼내 먹게 한다. 약 12주령부터 아주 쉬운 단계로 시작하고, 너무 어려워 필요량을 못 먹는 일이 없게 섭취량을 확인한다.
- `act_cat_box_explore_01` 종이상자·종이봉투 탐색: 숨기, 탐색, 잠복을 스스로 즐긴다. **비닐봉지는 질식 위험이 있어 쓰지 않는다.** 종이봉투 손잡이 끈, 테이프, 스테이플러 심은 제거한다.
- `act_cat_clicker_training_01` 클리커 트릭 훈련 (3~5분): 클릭 소리 뒤에 바로 간식을 주어 연결한 뒤 하이파이브, 이동장 들어가기 같은 행동을 가르친다(ASPCA). 머리를 쓰는 운동이자 교감 시간이다. 보상 간식은 아주 작게 주고 하루 칼로리에 포함한다.
- `act_cat_window_watch_01` 창가 해먹에서 바깥 구경: 움직임은 적지만 시각 자극과 휴식을 준다. **방충망과 창문 잠금을 확인한다.**
- `act_cat_toy_rotation_01` 장난감 돌려가며 혼자 놀기: 장난감 몇 개만 꺼내 두고 주기적으로 바꿔 새로움을 유지한다(OSU). 끈 달린 장난감은 혼자 있을 때 두지 않는다.
- `act_cat_scratching_stretch_01` 스크래처 긁기·스트레칭: 크고 안정된 스크래처로 발톱 관리와 전신 스트레칭을 한다. 관절이 불편한 노령묘는 가로형이 편하다.

### 성묘
- `act_cat_kibble_chase_01` 사료 던져 쫓기·숨겨 찾기 (성묘·노령묘): 사료를 한 알씩 굴리거나 여러 곳에 숨긴다. 하루 급여량에서 덜어 쓴다.
- `act_cat_kick_toy_01` 킥 토이 (성묘·노령묘): 끌어안고 뒷발로 차는 큰 인형으로 뒷다리 근육을 쓰게 한다. 거친 놀이 에너지를 사람 대신 인형에 풀 수 있다.
- `act_cat_harness_walk_01` 하네스 산책 (성묘): 실내에서 하네스에 충분히 적응한 고양이만 조용한 곳에서 천천히 탐색하게 한다. 반드시 고양이 전용 하네스를 쓰고, 겁이 많은 고양이에게는 억지로 시키지 않는다.

### 노령묘 (7세 이상)
- `act_cat_senior_floor_play_01` 노령묘 바닥 놀이 (3~10분): 러그 위에서 낚싯대를 천천히 움직여 누운 채로도 앞발을 뻗게 한다. 근육·관절 유연성 유지와 정서 안정에 도움이 된다(iCatCare·Cornell). 높이 점프하게 하지 않는다.
- 다리를 절거나 점프를 어려워하면 관절염일 수 있으니 진료를 받는다. 관절이 불편한 고양이를 위해 캣타워·창가에 계단이나 경사로를 둔다.
- 새끼 고양이를 들여 노령묘를 '활기차게' 하려는 시도는 권하지 않는다(iCatCare).

## 3. 안전 수칙

- **줄 달린 장난감은 삼키면 장이 꼬이는 응급 상황**이 생길 수 있다. 놀이가 끝나면 반드시 치운다. 실이나 끈을 삼킨 것 같으면 억지로 당기지 말고 즉시 동물병원에 간다.
- 높은 캣타워는 벽에 고정하고, 선반·해먹은 허용 무게를 확인한다.
- 삼킬 수 있는 작은 부품, 부서진 장난감, 솜이 터진 인형은 바로 치운다.
- 캣닢으로 지나치게 흥분해 공격적이 되면 사용을 줄인다.

## 4. 활동과 식단의 연결

퍼즐 피더, 사료 쫓기, 클리커 훈련에 쓰는 사료와 간식은 하루 급여량 안에서 덜어 쓴다. 체중 관리 중인 고양이는 퍼즐 피더와 짧은 사냥 놀이를 함께 하면 활동량을 늘리는 데 도움이 된다 (식단 문서의 `diet_cat_puzzle_feeder_01`, `diet_cat_weight_loss_plan_01` 참고).
