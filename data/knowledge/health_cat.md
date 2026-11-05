---
source: dailypet_knowledge/health_cat
title: 고양이 예방접종·정기점검 근거 설명
species: cat
category: health
updated: 2026-11-04
reviewed: true
sources:
  - https://wsava.org/wp-content/uploads/2024/05/2024-Guidelines-for-the-Vaccination-of-Dogs-and-Cats.pdf
  - https://aaha.org/wp-content/uploads/globalassets/02-guidelines/feline-vaccination-guidlines/feline-vaccine-table.pdf
  - https://mediahub.seoul.go.kr/archives/2014114
  - https://capcvet.org/guidelines/general-guidelines/
  - https://capcvet.org/guidelines/fleas/
  - https://heartwormsociety.org/images/Think_12_PDFs/5-13-factsheet-Puppies_and_Kitens_Neet_Protection.pdf
  - https://d3ft8sckhnqim2.cloudfront.net/images/AHS_Feline_Guidelines_Highlights23JAN2025.pdf
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC10812122
  - https://catvets.com/news/updated-feline-senior-care-guidelines/
  - https://catvets.com/life-stage
  - https://www.veterinarypracticenews.com/senior-pet-care-preventive-laboratory-work/
  - https://www.aaha.org/trends-magazine/publications/the-fix-by-five-initiative/
  - https://www.aaha.org/resources/2019-aaha-dental-care-guidelines-for-dogs-and-cats/
---

# 고양이 예방접종·정기점검 근거 설명

이 문서는 DailyPet 정기점검 카탈로그(`data/catalog/health_checks.json`)의 고양이 항목과 일정 계산 기준을 정리한 참고 자료다. 일정은 국제 가이드라인과 국내 자료를 요약한 **일반적인 기준**이다. 실제 접종 제품, 회차, 시기는 반드시 담당 수의사와 상담해 정한다. 이 문서는 진단이나 약 처방, 용량을 안내하지 않는다.

## 1. 일정 계산 방식

- `dose_schedule`의 첫 회차는 **생후 주령**, 다음 회차는 **이전 회차 뒤 몇 주**로 계산하고, 기초접종 뒤에는 `booster_interval_days`마다 추가접종한다.
- 구충·예방약·검진은 `start_age_weeks`부터 `interval_days`마다 반복된다.
- 실제 접종 날짜가 기록되면 다음 회차는 실제 날짜 기준으로 다시 계산한다. 입양 전 이력을 모르면 수의사와 일정을 다시 세운다.
- 고양이는 아픈 티를 잘 내지 않는다. 그래서 정기검진의 의미가 개보다 더 크다.

## 2. 핵심 백신

### 종합백신 `hc_cat_fvrcp` (FVRCP, core)
- 범백혈구감소증(고양이 파보), 허피스바이러스(비기관염), 칼리시바이러스를 막는 **모든 고양이의 핵심 백신**이다(WSAVA·AAHA/AAFP).
- 3~4주 간격으로 16주령 이후까지 기초접종하고, 6개월령 무렵 한 번 더 맞힌 뒤 주기적으로 추가접종한다.
- DailyPet 기본 일정: 1차 생후 8주 → 2차 4주 뒤(12주) → 3차 4주 뒤(16주) → 4차 10주 뒤(26주 무렵). 이후 추가접종 기본 간격은 **3년(1,095일)**이다.
- 시작 시기는 출처에 따라 6주 또는 8주다. 추가접종 주기는 주사형 3년, 비강형 1년으로 제품에 따라 다르다.
- **실내에서만 생활해도** 사람의 옷과 신발로 바이러스가 들어올 수 있어 핵심 백신은 필요하다.
- 고양이는 주사 부위 육종 예방을 위해 접종 부위를 기록하는 것이 중요하다. 접종 부위에 혹이 생겨 없어지지 않으면 진료를 받는다.

### 광견병 `hc_cat_rabies` (core, 국내 법정 의무)
- 국내에서는 **생후 3개월 이상의 개와 고양이 모두** 광견병 예방접종 대상이며, 매년 1회 보강 접종이 권고된다(서울시 자료).
- DailyPet 기본 일정: 생후 12주 1회, 이후 **매년(365일)** 추가접종.
- 실내묘도 국내 기준상 접종 대상이다. 지자체 봄·가을 지원 사업은 고양이도 이용할 수 있는 경우가 많으니 관할 지자체 공지를 확인한다.
- 의무 대상을 "개"로만 적은 과거 기사도 있고, 과태료 금액도 자료마다 다르다. 법령 원문으로 확인하지 못했으므로 최신 내용은 지자체에 확인한다.

## 3. 선택(비핵심) 백신

- `hc_cat_felv` 고양이 백혈병(FeLV): 감염묘와의 접촉으로 전파된다. **1세 미만 어린 고양이**, 외출하는 고양이, 외출묘와 함께 사는 고양이에게 특히 권장된다. 기본 일정은 8주 1차, 4주 뒤 2차, 이후 매년이다. 1세 이후에는 감염 위험에 따라 접종 여부와 간격(1년 또는 2~3년)을 정한다. 접종 전 감염 검사가 필요한지 수의사와 상의한다. 완전 실내에서 혼자 사는 성묘는 필요성이 낮을 수 있다.
- 일부 가이드라인은 FeLV를 1세 미만 고양이의 핵심 백신으로 보지만, DailyPet 카탈로그는 비핵심으로 표시하고 수의사 상담을 안내한다.

## 4. 기생충 예방

- `hc_cat_deworming_kitten` 어린 고양이 내부구충: 회충 등은 어린 고양이에게 흔하다. **생후 2주부터 2주 간격**으로 구충해 2개월령까지(2·4·6·8주) 이어가고, **6개월령까지 매월**(12·16·20·24주) 구충한다(CAPC 현행 기준). 과거 고양이 기준은 3주령 시작이었다. 1년차에 분변검사를 최소 4회 받는 것이 권장된다.
- `hc_cat_deworming_adult` 성묘 정기 내부구충·분변검사: 연중 광범위 구충제를 쓰지 않는 성묘는 **1년에 4번(90일마다)** 구충하고, 분변검사를 연 2회 이상 받는다. 실내묘도 생활환경에 따라 감염될 수 있다.
- `hc_cat_heartworm_prevention` 심장사상충 예방 (매월): 고양이도 모기를 통해 감염될 수 있다. **고양이에게는 치료약이 없어 예방이 유일한 대책**이다(AHS). 늦어도 8주령부터 연중 매월 예방하는 것이 권장된다. 고양이는 감염 진단이 어려우니 예방 시작 전 검사 여부를 수의사와 상의한다.
- `hc_cat_flea_tick` 외부기생충(벼룩·진드기) 예방: 고양이벼룩은 겨울에도 실내나 몸에서 살아남아 피부염과 조충 감염을 일으킬 수 있다. 라벨이 허용하는 시기부터 **평생 연중** 예방한다(기본 8주 시작, 매월).
- **매우 중요**: 개 전용 외부기생충 약(퍼메트린 함유 등)은 **고양이에게 치명적**일 수 있다. 절대 고양이에게 쓰지 않는다. 함께 사는 개에게 약을 바른 직후에는 마를 때까지 고양이와 접촉하지 않게 한다. 구충제와 예방약은 **고양이 전용 제품**만 쓰고, 제품과 용량은 수의사가 정한다.

## 5. 건강검진

- `hc_cat_first_checkup` 입양 후 첫 건강검진: 전신 상태, 체중, 기생충, 접종 이력을 확인하고 예방 일정을 세운다. 이동장·차량·병원 환경에 일찍 익숙해지게 하면 이후 병원 방문 스트레스를 줄일 수 있다. 재채기, 눈곱, 설사가 있으면 바로 진료를 받는다.
- `hc_cat_spay_neuter_consult` 중성화 시기 상담 (생후 16주 무렵): 수의계 합의(Feline Fix by Five)는 **생후 5개월까지** 중성화를 마치도록 권장한다. 첫 발정과 원치 않는 임신을 막고 유선 종양 위험을 줄이기 위해 그 전에 상담한다.
- `hc_cat_annual_checkup` 성묘 정기 건강검진 (연 1회): 최소 1년에 한 번 체중, 치아, 심장, 신장 이상을 확인한다. 7~10세 중년기부터는 기본 혈액·소변 검사를 함께 하는 것이 권장된다.
- `hc_cat_senior_checkup` 노령묘 정기검진 (6개월마다, 10세 이상): 10세 이상은 최소 6개월마다, 15세가 넘으면 4개월마다 검진이 권장된다(AAFP). 매번 체중, 체형·근육 점수, 혈압을 확인한다. DailyPet의 노령 연령 구간은 7세부터지만, 이 항목의 시작 나이는 출처 기준에 따라 10세(520주)로 둔다.
- `hc_cat_senior_kidney_screening` 혈액·소변 검사 (신장 기능 포함, 7세부터 연 1회): 중·노령묘에게 흔한 만성 신장병을 일찍 찾기 위해 일반혈액검사, 혈청 화학검사, 소변검사를 받는다. 나이가 들수록 횟수를 늘린다.
- `hc_cat_senior_thyroid_bp` 갑상선(T4)·혈압 검사 (10세부터 연 1회): 노령묘에게 흔한 갑상선기능항진증과 고혈압을 찾기 위한 검사다. 식욕은 좋은데 체중이 줄거나 활동이 지나치게 많아지면 진료를 받는다.
- `hc_cat_dental` 치과 검진·스케일링 (연 1회): 고양이는 치주질환과 치아흡수성 병변이 흔하다. 1세까지 첫 마취 하 치과 평가를 받고, 이후 정기 검진 때 구강을 확인한다. 침 흘림, 한쪽으로만 씹기, 사료를 떨어뜨리는 행동은 구강 통증 신호일 수 있다.

## 6. 접종 당일과 이상 신호

- 접종 후 약 30분은 병원에서 이상반응(얼굴 붓기, 구토, 호흡곤란 등)을 관찰한다. 당일에는 목욕과 격한 활동을 피한다.
- 집에 돌아온 뒤 숨쉬기 힘들어하거나 입을 벌리고 숨을 쉬거나, 구토를 반복하거나, 쓰러지면 **즉시 동물병원에 연락한다.**
- 물을 많이 마시거나, 체중이 줄거나, 하루 이상 먹지 않으면 일정과 관계없이 진료를 받는다.
