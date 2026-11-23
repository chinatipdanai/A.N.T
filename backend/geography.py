"""Offline country/area mapping for the collaboration overview.

Source: https://unstats.un.org/unsd/methodology/m49/overview/ (checked 2026-11-19).
Northern America, Central America and Caribbean combine as North America.
TH is a separate domestic bucket, never also counted in Asia. TW and XK are
application mappings for source codes: Asia and Europe respectively. Unmapped
or absent codes stay in UNKNOWN; no inferred country or nationality is stored.
"""
COUNTRY_GROUPS = {
    'AF': 'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW IO TF',
    'AS': 'AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KP KR KW KG LA LB MO MY MV MN MM NP OM PK PS PH QA SA SG LK SY TJ TH TL TR TM AE UZ VN YE TW',
    'EU': 'AX AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG VA HU IS IE IM IT JE LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH UA GB XK',
    'NA': 'AI AG AW BS BB BZ BM BQ CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PM PR BL KN LC MF VC SX TT TC US VG VI',
    'SA': 'AR BO BV BR CL CO EC FK GF GY PY PE GS SR UY VE',
    'OC': 'AS AU CX CC CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV UM VU WF HM',
    'AN': 'AQ',
}
COUNTRY_CONTINENT = {country: group for group, codes in COUNTRY_GROUPS.items() for country in codes.split()}
CONTINENTS = tuple(COUNTRY_GROUPS) + ('UNKNOWN',)


def collaboration_continent(country):
    code = (country or '').upper()
    return 'TH' if code == 'TH' else COUNTRY_CONTINENT.get(code, 'UNKNOWN')
