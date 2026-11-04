# 활동(Activity) 카탈로그 출처 목록

- 대상 파일: `data/catalog/activities.json` (개 14개, 고양이 14개, 모두 `reviewed: false`)
- 확인일: 2026-11-04
- 작성: Claude 웹 검색 초안. 사람 검수 전이며, 수치는 각 항목의 `review_notes`를 함께 확인할 것.

## 1. 사용한 검색 질의

| # | 질의 | 비고 |
|---|------|------|
| 1 | AKC how much exercise does a dog need puppy senior | |
| 2 | International Cat Care play with your cat indoor enrichment | |
| 3 | VCA exercise for senior dogs swimming joint | |
| 4 | PDSA how much exercise does my dog need puppy 5 minutes per month | |
| 5 | Cornell Feline Health Center environmental enrichment indoor cats play | Cornell 원문은 이 질의로 찾지 못함 |
| 6 | ASPCA dog nose work scent games enrichment puzzle feeder | |
| 7 | PDSA puppy exercise how much walk play (도메인 제한: pdsa / rspca / kennel club) | |
| 8 | icatcare playing with your cat games kitten (도메인 제한: icatcare.org) | |
| 9 | indoor cat enrichment play wand toy food puzzle vertical space (도메인 제한: cornell / vca / aspca / pdsa / osu / catvets / rspca) | |
| 10 | heatstroke dogs brachycephalic exercise hot weather (도메인 제한: avma / pdsa / rspca / vca / aspca / akc) | |
| 11 | older cat arthritis play exercise ramps gentle (도메인 제한: icatcare / cornell / vca / pdsa / catvets) | |
| 12 | tug of war dog rules safe play (도메인 제한: akc / aspca / vca / pdsa / rspca) | |
| 13 | 반려견 산책 놀이 운동 농림축산검역본부 동물보호관리시스템 | 운동 가이드가 아니라 펫티켓·등록 관련 기사만 나와 사용하지 않음 |
| 14 | AKC puppy exercise how much short walks play growth plates (도메인 제한: akc.org) | |
| 15 | clicker training cats tricks enrichment (도메인 제한: icatcare / aspca / vca / pdsa / rspca / cornell) | |
| 16 | puppy socialisation walks play training first months (도메인 제한: pdsa / rspca / aspca / vca / avsab) | |

## 2. 출처 목록

"확인 수준"이 **본문 확인**이면 WebFetch로 페이지 본문을 읽은 것이고, **검색 결과만**이면 검색 결과의 요약·발췌만 확인한 것이다.

### 개 (dog)

| 제목 | 기관 | URL | 확인 수준 | 근거로 쓴 item_id |
|------|------|-----|-----------|------------------|
| Exercise for dogs: our ultimate guide | PDSA | https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/how-much-exercise-does-your-dog-need | 본문 확인 | act_dog_basic_training_01, act_dog_daily_walk_01, act_dog_sniff_walk_01, act_dog_nosework_find_it_01, act_dog_fetch_01, act_dog_senior_gentle_play_01 |
| Exercising your puppy | PDSA | https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/exercising-your-puppy | 본문 확인 | act_dog_puppy_explore_walk_01, act_dog_basic_training_01 |
| Exercising your senior dog | PDSA | https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/puppies-dogs/exercising-your-senior-dog | 본문 확인 | act_dog_basic_training_01, act_dog_senior_short_walk_01, act_dog_nosework_find_it_01, act_dog_swimming_01, act_dog_senior_gentle_play_01 |
| Heatstroke in dogs | PDSA | https://www.pdsa.org.uk/pet-help-and-advice/pet-health-hub/conditions/heatstroke-in-dogs | 검색 결과만 | act_dog_daily_walk_01, act_dog_fetch_01, act_dog_jogging_01 |
| How Much Exercise Does a Dog Need Every Day? | American Kennel Club (AKC) | https://www.akc.org/expert-advice/health/how-much-exercise-does-dog-need/ | 본문 확인 | act_dog_daily_walk_01, act_dog_senior_short_walk_01, act_dog_indoor_obstacle_01, act_dog_swimming_01 |
| How Much Exercise Does a Puppy Need? Mental and Physical Exercises | American Kennel Club (AKC) | https://www.akc.org/expert-advice/health/puppies-mental-physical-exercise/ | 본문 확인 | act_dog_puppy_explore_walk_01, act_dog_basic_training_01, act_dog_sniff_walk_01, act_dog_fetch_01, act_dog_jogging_01 |
| Is Swimming Therapeutic for Senior Dogs? | American Kennel Club (AKC) | https://www.akc.org/expert-advice/health/swimming-senior-dogs/ | 본문 확인 | act_dog_swimming_01 |
| How to Provide Your Senior Dog With Proper Exercise | American Kennel Club (AKC) | https://www.akc.org/expert-advice/health/provide-senior-dog-proper-exercise | 본문 확인 | act_dog_senior_short_walk_01, act_dog_swimming_01 |
| How to Play Tug-of-War Safely With Your Dog | American Kennel Club (AKC) | https://www.akc.org/expert-advice/advice/is-tug-of-war-bad-for-dogs/ | 본문 확인 | act_dog_tug_01, act_dog_senior_gentle_play_01 |
| Canine DIY Enrichment | ASPCA | https://www.aspca.org/pet-care/dog-care/canine-diy-enrichment | 본문 확인 | act_dog_sniff_walk_01, act_dog_nosework_find_it_01, act_dog_snuffle_puzzle_01, act_dog_indoor_obstacle_01 |
| Dog Behavior and Training - Play and Exercise | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/dog-behavior-and-training-play-and-exercise | 본문 확인 | act_dog_fetch_01, act_dog_tug_01, act_dog_hide_and_seek_01, act_dog_jogging_01 |
| Fun Exercises for Dogs & Cats | VCA Animal Hospitals | https://vcahospitals.com/resources/preventive-dog/weight-exercise/fun-exercises-for-pets | 본문 확인 | act_dog_fetch_01, act_dog_tug_01, act_dog_hide_and_seek_01, act_dog_indoor_obstacle_01, act_cat_wand_hunt_01, act_cat_harness_walk_01 |
| Enriching Your Pet's Environment with Their Food | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/enriching-your-pets-environment-with-their-food | 본문 확인 | act_dog_snuffle_puzzle_01, act_cat_puzzle_feeder_01, act_cat_kibble_chase_01 |
| Walking or running with your dog | American Veterinary Medical Association (AVMA) | https://www.avma.org/resources-tools/pet-owners/petcare/walking-your-pet | 검색 결과만 (본문 가져오기 실패) | act_dog_jogging_01 |
| Caring for your dog in hot weather | RSPCA | https://www.rspca.org.uk/adviceandwelfare/seasonal/summer/dogs | 검색 결과만 | (JSON에는 미사용. 더위 관련 주의사항 검수 시 참고용) |

### 고양이 (cat)

| 제목 | 기관 | URL | 확인 수준 | 근거로 쓴 item_id |
|------|------|-----|-----------|------------------|
| Playing with your cat | International Cat Care | https://icatcare.org/articles/playing-with-your-cat | 본문 확인 | act_cat_wand_hunt_01, act_cat_kitten_short_play_01, act_cat_puzzle_feeder_01, act_cat_box_explore_01, act_cat_ball_chase_01, act_cat_senior_floor_play_01, act_cat_kick_toy_01, act_cat_toy_rotation_01 |
| Special considerations for senior cats | International Cat Care | https://icatcare.org/articles/special-considerations-for-senior-cats | 본문 확인 | act_cat_puzzle_feeder_01, act_cat_box_explore_01, act_cat_senior_floor_play_01, act_cat_kick_toy_01, act_cat_scratching_stretch_01 |
| Exercising your Cat | PDSA | https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/kittens-cats/exercise-for-your-cat | 본문 확인 | act_cat_wand_hunt_01, act_cat_kitten_short_play_01, act_cat_puzzle_feeder_01, act_cat_cat_tree_climb_01, act_cat_box_explore_01, act_cat_ball_chase_01, act_cat_scratching_stretch_01 |
| Cat Behavior and Training - Enrichment for Indoor Cats | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/cat-behavior-and-training---enrichment-for-indoor-cats | 본문 확인 | act_cat_wand_hunt_01, act_cat_puzzle_feeder_01, act_cat_kibble_chase_01, act_cat_cat_tree_climb_01, act_cat_window_watch_01, act_cat_harness_walk_01, act_cat_scratching_stretch_01 |
| Cat Behavior and Training - Play and Play Toys | VCA Animal Hospitals | https://vcahospitals.com/know-your-pet/cat-behavior-and-training---play-and-play-toys | 본문 확인 | act_cat_wand_hunt_01, act_cat_kitten_short_play_01, act_cat_ball_chase_01, act_cat_clicker_training_01, act_cat_kick_toy_01, act_cat_toy_rotation_01 |
| How To Exercise Your Cat | VCA Animal Hospitals | https://vcahospitals.com/resources/preventive-cat/weight-exercise/you-can-exercise-your-cat-too | 본문 확인 | act_cat_cat_tree_climb_01, act_cat_ball_chase_01, act_cat_harness_walk_01 |
| How To Make Vertical Space For Cats | VCA Animal Hospitals | https://vcahospitals.com/pediatric/kitten/prep-supplies/how-to-make-vertical-space-for-cats | 본문 확인 | act_cat_cat_tree_climb_01, act_cat_window_watch_01 |
| Toys - Cats - Indoor Pet Initiative | The Ohio State University College of Veterinary Medicine | https://indoorpet.osu.edu/cats/basic-indoor-cat-needs/toys | 본문 확인 | act_cat_toy_rotation_01 |
| Loving Care for Older Cats | Cornell Feline Health Center | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/loving-care-older-cats | 본문 확인 | act_cat_kibble_chase_01, act_cat_window_watch_01, act_cat_senior_floor_play_01 |
| Clicker Training Has Cats Jumping Through Hoops | ASPCA | https://www.aspca.org/news/clicker-training-has-cats-jumping-through-hoops | 본문 확인 | act_cat_clicker_training_01 |

## 3. 검수 시 참고

- 대부분 출처는 활동 종류와 주의사항은 제시하지만 **회당 시간·빈도 수치는 거의 주지 않는다.** 출처에 수치가 없는 항목은 `review_notes`에 "출처 없음 — 일반 가이드 기준, 검수 필요"로 표시했다.
- 출처끼리 수치가 다른 경우:
  - 강아지 산책 "월령×5분" 규칙: AKC는 제시, PDSA는 과학적 근거가 없다고 명시.
  - 조깅 시작 시기: AKC 글 사이에서도 다름 (견종 크기별 6~24개월 vs 14~18개월 미만 비권장).
  - 고양이 놀이 시간: PDSA 하루 2회·15~20분, VCA 여러 번·10분, VCA 운동 페이지 몇 시간마다 5~10분 (하루 약 30분), ICC 1분 정도의 강한 놀이도 충분.
- 한국 공공기관(농림축산식품부, 농림축산검역본부, 국가동물보호정보시스템) 자료에서는 운동량 가이드를 찾지 못했다. 국내 출처는 다음 작업에서 보강해야 한다.
- 출처가 직접 말하지 않은 일반 안전 수칙(비닐봉지 금지, 방충망 확인 등)은 해당 항목의 `review_notes`에 따로 표시했다.
