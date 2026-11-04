# 정기점검(Health) 카탈로그 출처 기록

- 대상 파일: `data/catalog/health_checks.json` (개 15, 고양이 14, 총 29개 항목, 모두 `reviewed: false`)
- 작성일(확인일): 2026-11-04
- 작성 방식: Claude 웹 검색(WebSearch) + 원문 열람(WebFetch). 설명문은 원문을 그대로 옮기지 않고 요약했다.
- **확인 수준 표기**
  - **열람**: 원문(PDF/웹페이지)을 직접 열어 수치를 확인함
  - **검색 결과만**: 검색 결과 요약/스니펫으로만 확인함. 원문 열람은 실패(403, 캡차)했거나 하지 않음. 검수할 때 원문을 꼭 대조해야 한다.

## 1. 사용한 검색 질의

| # | 질의 | 비고 |
|---|------|------|
| 1 | WSAVA 2024 guidelines for the vaccination of dogs and cats core vaccines puppy 6-8 weeks every 2-4 weeks until 16 weeks | WSAVA PDF 확보 |
| 2 | AAHA 2022 canine vaccination guidelines distemper parvovirus adenovirus puppy series booster | aaha.org는 403 → OAVT 요약 슬라이드 열람 |
| 3 | AAHA AAFP 2020 feline vaccination guidelines FVRCP FeLV kitten schedule | AAHA 고양이 접종표 PDF 열람 |
| 4 | American Heartworm Society canine guidelines start puppies 8 weeks year-round prevention testing | |
| 5 | 광견병 예방접종 의무 3개월 이상 개 고양이 가축전염병예방법 농림축산검역본부 | 검역본부 공식 페이지는 검색되지 않음 |
| 6 | 가축전염병예방법 시행규칙 광견병 예방접종 소유자 개 고양이 매년 law.go.kr | 법령 원문은 검색되지 않음 |
| 7 | American Heartworm Society feline heartworm guidelines cats prevention start 8 weeks year-round | |
| 8 | CAPC guidelines intestinal parasites puppies kittens deworming every 2 weeks 2 4 6 8 weeks then monthly | |
| 9 | animal.go.kr 반려견 예방접종 시기 종합백신 코로나장염 켄넬코프 광견병 | 공식 자료 없음(민간·블로그 위주라 쓰지 않음) |
| 10 | 농림축산검역본부 광견병 예방접종 반려동물 연 1회 생후 3개월 qia.go.kr | 서울시 미디어허브 확보 |
| 11 | CAPC heartworm cats recommendations year-round prevention testing; CAPC fleas ticks year-round control dogs cats | |
| 12 | AAHA senior care guidelines dogs cats wellness examination every 6 months bloodwork | |
| 13 | AAHA 2019 dental care guidelines dogs cats professional dental cleaning beginning 1 year of age small breed 2 years large | |
| 14 | WSAVA canine coronavirus vaccine not recommended; Bordetella parainfluenza non-core kennel cough | |
| 15 | AAFP AAHA 2021 feline senior care guidelines every 6 months exam blood pressure thyroid T4 urinalysis senior cat age | |
| 16 | AAHA AAFP feline life stage guidelines 2021 kitten visits annual examination at least once a year spay neuter by 5 months | |
| 17 | AAHA canine life stage guidelines 2019 neutering small breed dogs 5-6 months large breed after growth stops | |
| 18 | heartwormsociety.org canine guidelines summary puppies started on preventive no later than 8 weeks test 6 months after initial | |
| 19 | 가축전염병예방법 시행규칙 별표 광견병 개 고양이 소유자 예방접종 연 1회 과태료 (extended) | 과태료 금액이 기사마다 다름 |
| 20 | Veterinary Task Force on Feline Sterilization recommends spay neuter kittens before 5 months of age | |
| 21 | AAHA pet owner dental care annual oral exam professional cleaning starting age cats small breed dogs 1 year large breed 2 years | |
| 22 | 국립축산과학원 OR 농촌진흥청 반려견 예방접종 종합백신 코로나 장염 켄넬코프 접종 시기 2주 간격 | 공식 자료 없음 |
| 23 | 국내 반려견 심장사상충 감염률 예방 매월 연중 투약 권장 수의사회 OR 대학 연구 | |

## 2. 출처 목록

### 국제 가이드라인: 백신

| # | 제목 | 발행 | URL | 확인 수준 | 근거로 쓴 item_id |
|---|------|------|-----|-----------|-------------------|
| V1 | 2024 Guidelines for the Vaccination of Dogs and Cats - Executive Summary | WSAVA Vaccination Guidelines Group | https://wsava.org/wp-content/uploads/2024/05/2024-Guidelines-for-the-Vaccination-of-Dogs-and-Cats.pdf | 열람 (4쪽 요약본) | hc_dog_dhpp, hc_dog_rabies, hc_dog_leptospirosis, hc_dog_kennel_cough, hc_dog_coronavirus, hc_dog_first_checkup, hc_dog_annual_checkup, hc_cat_fvrcp, hc_cat_rabies, hc_cat_felv, hc_cat_annual_checkup |
| V2 | Vaccination Conversations Part 2: 2022 AAHA Canine Vaccination Guidelines (발표 자료) | OAVT / CommuniVET (AAHA 2022 가이드라인 요약) | https://oavt.org/wp-content/uploads/event-manager-uploads/supporting_documentation/2022/09/2022-AAHA-Canine-vaccination-guidelines_presentation.pdf | 열람 | hc_dog_dhpp, hc_dog_rabies, hc_dog_leptospirosis, hc_dog_kennel_cough |
| V3 | 2022 AAHA Canine Vaccination Guidelines | AAHA | https://www.aaha.org/guidelines/2022-AAHA-Canine-Vaccination-Guidelines | 검색 결과만 (열람 시 403) | hc_dog_leptospirosis (2024년 렙토 core 변경) |
| V4 | WSAVA Canine Vaccination Guidelines (WSAVA Congress Proceedings 2017, M. J. Day) | WSAVA / VIN | https://www.vin.com/doc/?id=8506324 | 열람 | hc_dog_kennel_cough, hc_dog_coronavirus |
| V5 | Feline Vaccination Schedule for General Practice (2020 AAHA/AAFP Feline Vaccination Guidelines 기반) | AAHA / AAFP | https://aaha.org/wp-content/uploads/globalassets/02-guidelines/feline-vaccination-guidlines/feline-vaccine-table.pdf | 열람 | hc_cat_fvrcp, hc_cat_rabies, hc_cat_felv |

### 국내 자료: 광견병 법정 접종, 심장사상충

| # | 제목 | 발행 | URL | 확인 수준 | 근거로 쓴 item_id |
|---|------|------|-----|-----------|-------------------|
| K1 | 봄철 반려동물 광견병 예방접종 지원 (2025) | 서울특별시 미디어허브 | https://mediahub.seoul.go.kr/archives/2014114 | 열람 | hc_dog_rabies, hc_cat_rabies |
| K2 | 광견병 예방접종 실시 보도자료 (2013, 가축전염병예방법 제20조·제60조 언급) | 서울 금천구청 | https://m.geumcheon.go.kr/portal/selectBbsNttView.do?key=297&id=&bbsNo=8&nttNo=76416&searchCtgry=&searchCnd=all&searchKrwd=&pageIndex=771&integrDeptCode=&searchDeptCode= | 열람 | hc_dog_rabies, hc_cat_rabies |
| K3 | [애니팩트] 반려견의 광견병 예방접종은 의무다 (2016) | 한국일보 | https://www.hankookilbo.com/news/article/201610171192115901 | 열람 | hc_dog_rabies |
| K4 | 경기도 전역에서 8% 이상 심장사상충 감염…연중 예방 중요 (한국동물위생학회지 연구 보도, 2021) | 데일리벳 | https://www.dailyvet.co.kr/?p=141566 | 열람 | hc_dog_heartworm_prevention |

> 농림축산검역본부(qia.go.kr), 농림축산식품부, 대한수의사회, 법제처(law.go.kr)의 원문은 검색되지 않았다. 광견병 법정 의무의 조문과 과태료 금액은 **법제처 원문으로 확인하지 못했다**.

### 국제 가이드라인: 기생충(CAPC, AHS)

| # | 제목 | 발행 | URL | 확인 수준 | 근거로 쓴 item_id |
|---|------|------|-----|-----------|-------------------|
| P1 | CAPC Guidelines: General Guidelines for Dogs and Cats | Companion Animal Parasite Council | https://capcvet.org/guidelines/general-guidelines/ | 열람 | hc_dog_deworming_puppy, hc_dog_deworming_adult, hc_dog_heartworm_prevention, hc_dog_flea_tick, hc_dog_first_checkup, hc_dog_annual_checkup, hc_dog_senior_checkup, hc_cat_deworming_kitten, hc_cat_deworming_adult, hc_cat_heartworm_prevention, hc_cat_flea_tick, hc_cat_first_checkup, hc_cat_annual_checkup |
| P2 | CAPC Guidelines: Fleas | CAPC | https://capcvet.org/guidelines/fleas/ | 검색 결과만 | hc_dog_flea_tick, hc_cat_flea_tick |
| P3 | CAPC Guidelines: Ticks | CAPC | https://capcvet.org/guidelines/ticks/ | 검색 결과만 | hc_dog_flea_tick |
| P4 | Does my dog need a heartworm preventive? (FAQ) | American Heartworm Society | https://d3ft8sckhnqim2.cloudfront.net/images/Think_12_PDFs/AHS_FAQ_2_7APR21.pdf | 열람 | hc_dog_heartworm_prevention, hc_dog_annual_checkup |
| P5 | Puppies and Kittens Need Protection (fact sheet) | American Heartworm Society | https://heartwormsociety.org/images/Think_12_PDFs/5-13-factsheet-Puppies_and_Kitens_Neet_Protection.pdf | 검색 결과만 | hc_dog_heartworm_prevention, hc_cat_heartworm_prevention |
| P6 | AHS Feline Guidelines Highlights (2025) | American Heartworm Society | https://d3ft8sckhnqim2.cloudfront.net/images/AHS_Feline_Guidelines_Highlights23JAN2025.pdf | 검색 결과만 | hc_cat_heartworm_prevention |

### 국제 가이드라인: 검진, 노령, 치과, 중성화

| # | 제목 | 발행 | URL | 확인 수준 | 근거로 쓴 item_id |
|---|------|------|-----|-----------|-------------------|
| C1 | AAHA Senior Care Guidelines for Dogs and Cats - Toolkit (2023 가이드라인) | AAHA | https://aaha.org/wp-content/uploads/2024/04/aaha-senior-care-guidelines-toolkit-new.pdf | 열람 (검진 주기 수치는 없음) | hc_dog_senior_checkup, hc_dog_senior_bloodwork, hc_dog_dental |
| C2 | Senior pet care: Underscoring the value of preventive laboratory work in aging pets (2024) | Veterinary Practice News | https://www.veterinarypracticenews.com/senior-pet-care-preventive-laboratory-work/ | 열람 | hc_dog_senior_checkup, hc_dog_senior_bloodwork, hc_cat_senior_kidney_screening |
| C3 | AAFP Releases Updated Feline Senior Care Guidelines to the Veterinary Community | AAFP | https://catvets.com/news/updated-feline-senior-care-guidelines/ | 검색 결과만 | hc_cat_senior_checkup |
| C4 | 2021 AAFP Feline Senior Care Guidelines (J Feline Med Surg 23(7):613-638) | AAFP / PubMed Central | https://pmc.ncbi.nlm.nih.gov/articles/PMC10812122 | 열람 (앞부분 약 100k자) | hc_cat_deworming_adult, hc_cat_flea_tick, hc_cat_annual_checkup, hc_cat_senior_checkup, hc_cat_senior_kidney_screening, hc_cat_senior_thyroid_bp, hc_cat_dental |
| C5 | 2021 AAHA/AAFP Feline Life Stage Guidelines | AAFP | https://catvets.com/life-stage | 검색 결과만 | hc_cat_first_checkup, hc_cat_annual_checkup, hc_cat_senior_checkup |
| C6 | Spay and Neuter Timing (2019 AAHA Canine Life Stage Guidelines) | AAHA | https://www.aaha.org/resources/life-stage-canine-2019/spay-and-neuter-timing/ | 검색 결과만 | hc_dog_neuter_consult |
| C7 | The Fix by Five Initiative | AAHA Trends Magazine | https://www.aaha.org/trends-magazine/publications/the-fix-by-five-initiative/ | 검색 결과만 | hc_cat_spay_neuter_consult |
| C8 | 2019 AAHA Dental Care Guidelines for Dogs and Cats | AAHA | https://www.aaha.org/resources/2019-aaha-dental-care-guidelines-for-dogs-and-cats/ | 검색 결과만 | hc_dog_dental, hc_cat_dental |
| C9 | From the Guidelines: Elevating Everyday Dentistry | AAHA Trends Magazine | https://www.aaha.org/trends-magazine/publications/from-the-guidelines-elevating-everyday-dentistry/ | 검색 결과만 | hc_dog_dental, hc_cat_dental |
| C10 | AAHA Dental Care Guidelines for Dogs and Cats (2005, JAAHA 41(5)) | Journal of the American Animal Hospital Association | https://jaaha.kglmeridian.com/view/journals/aaha/41/5/article-p277.xml | 검색 결과만 | hc_dog_dental, hc_cat_dental |

참고만 하고 인용하지 않은 자료: 로얄캐닌 코리아 백신 일정 페이지(제조사 자료라서 제외. 다만 "매년 추가접종"으로 안내하는 국내 관행과의 상충은 hc_dog_dhpp review_notes에 적어 둠), 블로그·쇼핑몰·병원 광고 글.

## 3. 상충하거나 출처가 없는 수치 요약 (검수 우선순위)

1. **광견병 법정 의무(개·고양이)**: 지자체 자료는 "생후 3개월 이상 개와 고양이"로 안내한다. 반면 2016년 한국일보 기사는 의무 대상을 "개"로만 적었다. 과태료 금액도 기사마다 100만, 200만, 500만 원으로 다르다. 법제처 원문을 확인하지 못했다.
2. **개 종합백신(DHPP) 추가접종**: AAHA는 3년, 국내 제조사 자료는 매년으로 안내한다. 기초접종 뒤 재접종 시점도 WSAVA는 26주령, AAHA는 "1년 이내"로 서로 다르다. 첫 접종 6주령은 국내 관행이고 원문에서 확인하지 못했다.
3. **렙토스피라 core 여부**: AAHA는 2024년에 모든 개의 core로 바꿨고, WSAVA는 풍토병 지역에서만 core로 본다.
4. **켄넬코프 시작 8주, 외부기생충 시작 8주, 첫 건강검진 8주, 중성화 상담 16주·20주**: 출처에 직접 나온 수치가 아니라 앱 기본값이다.
5. **코로나 장염**: WSAVA는 "권장하지 않음"으로 분류한다. 국내 접종 일정은 공신력 있는 출처를 찾지 못해 비워 두었다.
6. **FVRCP 시작 6주 vs 8주, 추가접종 주기**: 주사형은 3년, 비강형은 1년이다.
7. **FeLV**: 1세 미만 고양이에게는 core인데 이 카탈로그는 비핵심(core=false)으로 표기했다. 추가접종은 감염 위험에 따라 1년 또는 2~3년이다.
8. **고양이 구충 시작**: CAPC 현행 기준은 2주령이고, 과거 고양이 기준은 3주령이었다.
9. **노령 검진·혈액검사 주기**: 6개월마다인지 6~12개월마다인지 출처마다 다르다. 노령묘 기본검사 시작 나이도 7세와 10세로 갈린다. 노령견 시작 나이는 견종에 따라 달라 null로 두었다.
10. **치과 시작 나이**: 2005년 가이드라인은 대형견 2세부터, 2019년 가이드라인은 소·중형견과 고양이 1세까지로 되어 있다. 2019년 기준의 연간 주기는 원문에서 확인하지 못했다.
