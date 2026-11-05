---
source: dailypet_knowledge/activity_dog
title: 개 활동·운동 근거 설명
species: dog
category: activity
updated: 2026-11-04
reviewed: true
sources:
  - https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/how-much-exercise-does-your-dog-need
  - https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/exercising-your-puppy
  - https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/exercising-your-senior-dog
  - https://www.pdsa.org.uk/pet-help-and-advice/pet-health-hub/conditions/heatstroke-in-dogs
  - https://www.akc.org/expert-advice/health/how-much-exercise-does-dog-need/
  - https://www.akc.org/expert-advice/health/puppies-mental-physical-exercise/
  - https://www.akc.org/expert-advice/health/swimming-senior-dogs/
  - https://www.akc.org/expert-advice/health/provide-senior-dog-proper-exercise
  - https://www.akc.org/expert-advice/advice/is-tug-of-war-bad-for-dogs/
  - https://www.aspca.org/pet-care/dog-care/canine-diy-enrichment
  - https://vcahospitals.com/know-your-pet/dog-behavior-and-training-play-and-exercise
  - https://vcahospitals.com/resources/preventive-dog/weight-exercise/fun-exercises-for-pets
  - https://vcahospitals.com/know-your-pet/enriching-your-pets-environment-with-their-food
  - https://www.avma.org/resources-tools/pet-owners/petcare/walking-your-pet
---

# 개 활동·운동 근거 설명

이 문서는 DailyPet 활동 카탈로그(`data/catalog/activities.json`)의 개 항목을 고른 이유와 주의할 점을 정리한 참고 자료다. 출처를 요약한 일반 정보이며, 관절·심장 질환이 있거나 수술 뒤 회복 중인 개는 운동 수준을 수의사와 먼저 정한다.

## 1. 운동량을 정하는 기본 원칙

- 필요한 운동량은 **견종, 나이, 체력, 건강 상태**에 따라 크게 다르다(PDSA·AKC). 같은 성견이라도 활동적인 작업견 계열과 소형 반려견은 필요량이 다르다.
- 대부분의 출처는 운동 종류와 주의사항은 제시하지만 회당 시간·빈도의 정확한 수치는 거의 주지 않는다. 카탈로그의 시간·빈도는 일반 가이드를 바탕으로 한 **앱 기본값**이며 개의 반응을 보며 조절한다.
- 몸을 쓰는 운동만큼 **머리를 쓰는 활동**(냄새 맡기, 훈련, 퍼즐)도 중요하다. 짧은 시간에도 만족감을 주어 실내 생활이 많은 개, 노령견, 관절이 약한 개에게 특히 좋다(ASPCA·AKC).
- 개가 숨이 차거나, 자꾸 앉거나 눕거나, 뒤처지면 즉시 멈춘다.

## 2. 강도와 연령대별 항목

DailyPet은 활동 강도를 `low`(저강도), `medium`(중강도), `high`(고강도)로 나누고, 연령대는 어린 강아지(12개월 미만), 성견, 노령견(7세 이상, 대형견 6세 이상)으로 나눈다.

### 어린 강아지
- `act_dog_puppy_explore_walk_01` 퍼피 탐색 산책 (저강도, 5~15분): 운동량보다 새로운 소리·냄새·바닥을 긍정적으로 경험하게 하는 것이 목적이다. **예방접종이 끝나기 전에는 공공장소 산책 대신 집·마당에서 논다.** 잔디처럼 부드러운 바닥을 고르고 점프·급정지는 피한다.
- 강아지 산책 시간을 "월령 × 5분"으로 정하는 규칙은 AKC가 제시하지만, PDSA는 과학적 근거가 없다고 본다. 시간보다 강아지의 피로 신호를 우선한다.
- `act_dog_tug_01` 터그 놀이는 어린 강아지에게는 아주 약한 힘으로만 한다.
- 성장 중인 강아지는 반복 점프, 급출발·급정지가 많은 놀이를 피한다.

### 모든 연령에 맞는 저강도 항목
- `act_dog_basic_training_01` 짧은 기본 훈련 (5~10분, 하루 2~3회): 앉아·기다려·이리와를 보상 기반으로 짧게 연습한다. 나이 든 개도 새 신호를 배울 수 있다. 훈련 간식은 하루 사료량에서 덜어 쓴다.
- `act_dog_sniff_walk_01` 냄새 맡기 산책 (15~30분): 속도를 늦추고 원하는 곳에서 충분히 냄새를 맡게 한다. 체력 부담이 적어 노령견과 관절이 약한 개에게도 맞다.
- `act_dog_nosework_find_it_01` 노즈워크 '찾아' 게임 (실내): 간식을 가까이 던지며 '찾아'를 가르치고 점점 숨기는 곳을 늘린다. 초콜릿·포도·자일리톨처럼 개에게 독성이 있는 음식은 절대 쓰지 않는다.
- `act_dog_snuffle_puzzle_01` 스너플 매트·퍼즐 급여 (실내): 하루 사료 일부를 매트나 상자에 숨겨 찾아 먹게 한다. 손으로 만든 퍼즐은 삼킬 수 있는 재료가 없는지 확인하고 사용 중에는 지켜본다.
- `act_dog_hide_and_seek_01` 숨바꼭질 놀이 (실내): 사람이 숨고 개가 찾게 해 '이리와' 연습도 된다. 계단이나 미끄러운 바닥을 급하게 달리지 않는 장소를 고른다.

### 성견
- `act_dog_daily_walk_01` 일상 산책 (중강도, 30~60분, 하루 1~2회): 빠르게 걸으면 에너지 소모, 천천히 걸으면 정신 건강에 도움이 된다. 외출 시 목줄과 인식표를 착용한다.
- `act_dog_fetch_01` 공 던지기 (고강도): 에너지가 많은 성견에게 좋다. 나뭇가지는 입·목 부상 위험이 있어 던지지 않는다. 공을 높이 던져 점프하게 하지 않는다. **관절질환, 심한 비만, 수술 후 회복, 단두종인 개에게는 권하지 않는다.**
- `act_dog_tug_01` 터그 놀이 (중강도): 시작 전에 '놔' 신호를 가르치고 옆으로·앞뒤로 부드럽게 당긴다. 위아래로 홱 당기면 목·척추를 다칠 수 있다. 관절질환·수술 후 회복 중이면 제외한다.
- `act_dog_indoor_obstacle_01` 실내 장애물 코스 (중강도, 실내): 쿠션·상자로 낮은 장애물을 만들어 날씨가 나쁜 날의 실내 운동으로 쓴다. 미끄럼 방지 매트를 깔고 점프는 낮게 한다.
- `act_dog_jogging_01` 보호자와 함께 조깅 (고강도): **성장판이 닫힌 뒤에만** 시작한다. AKC 기준으로 소형견 약 6~8개월, 중형견 12개월, 대형견 12~18개월, 초대형견 18~24개월 이후다(출처마다 다소 다름). 단두종, 심장질환, 관절질환, 심한 비만, 수술 후 회복 중인 개는 제외하고, 시작 전에 수의사와 상의한다.

### 노령견
- `act_dog_senior_short_walk_01` 노령견 짧고 잦은 산책 (저강도, 10~20분, 하루 2~3회): 가끔 길게 걷기보다 짧게 자주 걷는 편이 관절이 굳지 않게 하는 데 좋다(PDSA·AKC). 산책 후 뻣뻣해하면 다음 산책을 더 짧게 한다. 산책량이 줄면 발톱이 길어지니 정기적으로 확인한다.
- `act_dog_senior_gentle_play_01` 노령견 저충격 실내 놀이 (저강도): 점프나 몸을 비트는 동작 없이 장난감을 천천히 굴리거나 간단한 트릭으로 몸과 머리를 가볍게 쓰게 한다. 근력과 인지 기능 유지에 도움이 된다.
- `act_dog_swimming_01` 수영·수중 운동 (중강도, 성견·노령견): 물의 부력 덕분에 관절 부담이 적다. 관절염이 있거나 체중 관리가 필요한 개에게 도움이 된다(AKC). 시작 전에 수의사와 상담하고, 구명조끼와 스스로 나올 수 있는 계단을 확인한다. **수술 부위가 아물기 전, 귀 감염·피부병이 있을 때는 하지 않는다.**

## 3. 더위와 단두종 주의

- 더운 날에는 이른 아침이나 저녁처럼 서늘한 시간대에 걷고 물을 챙긴다. 여름철 뜨거운 아스팔트는 발바닥 화상 위험이 있다.
- 퍼그, 불독 같은 **단두종**은 호흡이 어려워 더위와 고강도 운동에 특히 취약하다. 공 던지기·조깅 같은 고강도 항목은 추천하지 않고 시간과 강도를 줄인다.
- 헐떡임이 심하거나, 비틀거리거나, 침을 많이 흘리거나, 잇몸 색이 평소와 다르면 열사병일 수 있다. 서늘한 곳으로 옮기고 **즉시 동물병원에 연락한다.**

## 4. 실내 활동이 필요한 경우

비 오는 날, 미세먼지가 심한 날, 접종을 마치지 않은 강아지, 관절이 약한 개는 실내 저강도 활동을 우선한다. 카탈로그에서 실내 항목은 노즈워크, 스너플 매트, 숨바꼭질, 실내 장애물 코스, 기본 훈련, 노령견 저충격 놀이다.

## 5. 활동과 식단의 연결

훈련·노즈워크·퍼즐에 쓰는 간식과 사료는 하루 칼로리에 포함한다. 간식은 하루 칼로리의 10% 이내로 한다 (식단 문서 참고). 체중 감량 중인 개는 수영, 냄새 맡기 산책처럼 관절 부담이 적은 항목부터 늘린다.
