// Dil anahtarları (kaynak: Türkçe). tools/i18n.mjs üretir; elle düzenleme. Kimlik = sıra.
const I18N_KEYS = [
"Bronz", // 0
"Gümüş", // 1
"Altın", // 2
"Platin", // 3
"Elmas", // 4
"Usta", // 5
"Efsane", // 6
"Klasik oyun", // 7
"Kırılan tuğla", // 8
"En iyi combo", // 9
"En uzak bölüm", // 10
"Yenilen boss", // 11
"ÇILGIN MOD", // 12
"Atlatılan lanet", // 13
"Yakalanan kapsül", // 14
"Oynama süresi", // 15
"Kapışma", // 16
"Galibiyet", // 17
"Podyum (ilk 3)", // 18
"En uzun seri", // 19
"Dereceli maç", // 20
"Dereceli galibiyet", // 21
"Çevrim içi maç", // 22
"Gönderilen saldırı", // 23
"Kalkanla engellenen", // 24
"Dramaturg görevi", // 25
"İlk Tuğla", // 26
"İlk tuğlanı kır", // 27
"Yıkım Ekibi", // 28
"Toplam 1.000 tuğla kır", // 29
"Zincirleme", // 30
"20 combo yap", // 31
"Çılgın", // 32
"ÇILGIN MOD'a gir", // 33
"Boss Avcısı", // 34
"Bir boss yen", // 35
"İmparator Düştü", // 36
"Demir İmparator'u yenip 11. bölüme ulaş", // 37
"Labirentin Sonu", // 38
"11. bölümü de bitir", // 39
"50.000 Kulübü", // 40
"Tek oyunda 50.000 puan topla", // 41
"Lanet Avcısı", // 42
"Toplam 50 lanet atlat", // 43
"Kapsül Bağımlısı", // 44
"Toplam 100 kapsül yakala", // 45
"İlk Kapışma", // 46
"Bir kapışmayı bitir", // 47
"İlk Zafer", // 48
"Bir kapışmayı kazan", // 49
"Seri Galip", // 50
"3 kapışmayı üst üste kazan", // 51
"Durdurulamaz", // 52
"5 kapışmayı üst üste kazan", // 53
"Kalabalığın Kralı", // 54
"8 kişilik bir maçı kazan", // 55
"Makine Avcısı", // 56
"Efsane güçte (1600+ LP) bot olan bir maçı kazan", // 57
"Kusursuz", // 58
"Hiç can kaybetmeden bir kapışmayı kazan", // 59
"Son Nefes", // 60
"Tek canın kalmışken bir kapışmayı kazan", // 61
"Sokakların Kralı", // 62
"Arkadaşlarınla oynanan bir maçı kazan", // 63
"Sabotajcı", // 64
"Toplam 50 saldırı gönder", // 65
"Kalkan Duvarı", // 66
"10 saldırıyı kalkanla engelle", // 67
"Yerleşti", // 68
"{n} yerleştirme maçını tamamla", // 69
"{tier} Lig", // 70
"{tier} lige yüksel", // 71
"Başarım: {name}", // 72
"{tier} lige yükseldin!", // 73
"{tier} lige düştün", // 74
"🏳 Dereceli maç yarıda kaldı", // 75
"{n} LP · son sıra sayıldı", // 76
"Yerleştirme {a}/{b}", // 77
"{tier} için {n} LP", // 78
"En yüksek lig!", // 79
"zirve {n}", // 80
"dereceli galibiyet", // 81
"🏅 Kariyer", // 82
"Dereceli lig, istatistikler, maç geçmişi, başarımlar", // 83
"{h} sa {m} dk", // 84
"{m} dk", // 85
"%{n}", // 86
"(şu an {n})", // 87
"🏅 Dereceli", // 88
"🤖 Botlar", // 89
"🌐 Çevrim içi", // 90
"Henüz kapışma yok — Rekabet panelinden bir maç başlat!", // 91
"Tarih", // 92
"Mod", // 93
"Sıra", // 94
"Skor", // 95
"Başarımlar · {a}/{b}", // 96
"Açıldı: {date}", // 97
"Kilitli", // 98
"Emin misin? Puan, istatistik ve başarımlar silinir — tekrar tıkla", // 99
"Kariyeri sıfırla", // 100
"☀️ GÜNLÜK MEYDAN OKUMA", // 101
"Önce klasik oyunda {n}. bölüme ulaş", // 102
"Bölüm {n} pratiği", // 103
"Bugünkü deneme kullanıldı", // 104
"Bugünün koşusu hazır", // 105
"1 can · Kabus lanetleri · +%15 hız", // 106
"En iyi {best} · Seri {n} gün", // 107
"☀️ Bugünkü deneme kullanıldı", // 108
"☀️ Bugünün koşusunu başlat", // 109
"🎯 Meydan Okuma", // 110
"🎯 Meydan", // 111
"Bölüm seçimi, pratik ve günlük meydan okuma", // 112
"Tek Vuruş", // 113
"En temel tuğla: bir vuruşta kırılır.", // 114
"Bir tuğla kır.", // 115
"İki Vuruş", // 116
"İki vuruş ister; ilk vuruşta çatlar.", // 117
"Dayanıklı bir tuğla kır.", // 118
"Üç Vuruş", // 119
"Üç vuruş ister; en sert normal tuğla.", // 120
"En sert tuğlayı kır.", // 121
"Kırılmaz", // 122
"Kırılmaz; bölümü bitirmek için şart değil.", // 123
"Kırılmaz bir tuğlaya çarp.", // 124
"Patlayıcı", // 125
"Kırılınca komşularını da patlatır.", // 126
"Patlayıcı bir tuğla kır.", // 127
"Elektrikli", // 128
"Her vuruşta en yakın 3 tuğlaya yıldırım atar.", // 129
"Elektrikli bir tuğla kır.", // 130
"×10 puan, altın yağmuru ve kesin iyi kapsül.", // 131
"Altın bir tuğla kır.", // 132
"Çoğaltan", // 133
"Kırılınca aşağı doğru yeni bir top çıkar.", // 134
"Çoğaltan bir tuğla kır.", // 135
"Süreli lanet · {n} sn", // 136
"Anlık lanet", // 137
"Bir lanet atlat.", // 138
"Bölüm {n} bossu · {hp} can", // 139
"Boss'u yen.", // 140
"{name} · SEVİYE {n}", // 141
"YENİ KART: {name}", // 142
"📖 Koleksiyon", // 143
"{a}/{b} keşfedildi · toplam {c}/{d}", // 144
"Bir laneti ne kadar çok atlatırsan kartı o kadar yükselir; her seviye o lanetin süresini %10 kısaltır.", // 145
"Kartlar yalnızca bu cihazda saklanır. Seviye eşikleri: 1, 5 ve 15.", // 146
"{n} kez · Sv.{lvl}", // 147
"Keşfedilmedi", // 148
"Emin misin? Tüm kartlar silinir — tekrar tıkla", // 149
"Koleksiyonu sıfırla", // 150
"GÖRÜNMEZ RAKET", // 151
"GÖRÜNMEZ", // 152
"HAYALET TOP", // 153
"HAYALET", // 154
"KARANLIK", // 155
"ELEKTRİK KESİNTİSİ", // 156
"KESİNTİ", // 157
"SİS", // 158
"AYNA DÜNYA", // 159
"AYNA", // 160
"SARHOŞ KAMERA", // 161
"SARHOŞ", // 162
"RÜZGAR", // 163
"AĞIR YERÇEKİMİ", // 164
"AĞIR", // 165
"NABIZ", // 166
"BUZLU RAKET", // 167
"BUZ", // 168
"YARIK RAKET", // 169
"YARIK", // 170
"SAHTE TOPLAR", // 171
"SAHTE", // 172
"METEOR YAĞMURU", // 173
"METEOR", // 174
"DARALAN DUVARLAR", // 175
"DUVAR", // 176
"GEZGİN BARİYERLER", // 177
"BARİYER", // 178
"TAVAN ÇÖKÜYOR", // 179
"TUĞLALAR İNİYOR!", // 180
"DİRİLİŞ", // 181
"ZIRHLANMA", // 182
"UFO BASKINI", // 183
"{x} BİTTİ", // 184
"UFO DÜŞTÜ! +750", // 185
"Boss'u 30 sn içinde yen", // 186
"{n} tuğla kır", // 187
"Bu bölümü can kaybetmeden bitir", // 188
"Bir kez 8 combo yap", // 189
"2 altın tuğla kır", // 190
"Bir lanet atlat", // 191
"{x} — TAMAM", // 192
"🎬 {x} TAMAM! +{n}", // 193
"{x} — kaçtı", // 194
"🎬 DRAMATURG: NEFES AL", // 195
"Zor anda bir nefes", // 196
"🎬 GÖSTERİ ZAMANI", // 197
"Sahne ışıkları", // 198
"🏆 Rekoru geçtin!", // 199
"eski rekor {n}", // 200
"BÖLÜM {n}", // 201
"🌀 TÜNEL FIRTINASI", // 202
"👻 En iyi hayalet: {score} puan · bölüm {level}", // 203
"Henüz hayalet yok — bir klasik koşu tamamla; en iyi skorun burada saklanır.", // 204
"⚠️ Önce bir klasik koşu tamamla.", // 205
"📋 Hayalet kodu panoya kopyalandı.", // 206
"Kodu kutudan kopyala.", // 207
"📥 Hayalet yüklendi — bir sonraki klasik koşuda yarışır.", // 208
"⚠️ Geçersiz hayalet kodu.", // 209
"🗑 Hayalet silindi.", // 210
"SON TOP BAHSİ: DEVAM", // 211
"TUĞLA KRAL", // 212
"DEMİR İMPARATOR", // 213
"Bas Fırtınası", // 214
"Hız Treni", // 215
"Kristal Yağmur", // 216
"Gece Sakinliği", // 217
"Neon Dalga", // 218
"{adj} {noun}", // 219
"⚠️ Ses analiz edilemedi, efektler kapalı", // 220
"Dinleniyor…", // 221
"({n} sn)", // 222
"🔇 Video sessiz başlatıldı", // 223
"⚠️ Video başlatılamadı — sayfaya bir kez tıkla", // 224
"⚠️ Müzik başlatılamadı — sayfaya bir kez tıkla", // 225
"CAM TOP", // 226
"+%25 puan, top %10 daha hızlı", // 227
"KAN BEDELİ", // 228
"-1 can, +%40 puan", // 229
"BOSS AVCI", // 230
"Bosslar +%50 can, +%20 puan", // 231
"LANET MIKSI", // 232
"Lanetler +%25 uzun, lanet bonusu +0.5", // 233
"ALTIN ATEŞİ", // 234
"Altın tuğla ×2, normal puan -%10", // 235
"KALKAN USTASI", // 236
"+3 kalkan, -%10 puan", // 237
"SIFIR NOKTA", // 238
"1 cana düş, tüm puanlar ×1.6", // 239
"SESSİZ GECE", // 240
"Lanetler kapalı, -%20 puan", // 241
"GENİŞ", // 242
"ÇOKLU", // 243
"YAVAŞ", // 244
"ATEŞ", // 245
"LAZER", // 246
"YAPIŞ", // 247
"DEV", // 248
"KALKAN", // 249
"DELİK", // 250
"+CAN", // 251
"+1 CAN", // 252
"KAOS?", // 253
"KAOS → {x}", // 254
"TERS", // 255
"MİNİ", // 256
"HIZ", // 257
"LANET", // 258
"SÜPER!", // 259
"MUHTEŞEM!", // 260
"EFSANE!", // 261
"TANRISAL!", // 262
"BU NE BE?!", // 263
"★ ÇILGIN MOD ★", // 264
"+TOP", // 265
"BOING!", // 266
"FALSO!", // 267
"FIRLATMA!", // 268
"SMASH!", // 269
"FALSO", // 270
"ÖFKELENDİ!", // 271
"{name} YENİLDİ!", // 272
"SERSEMLEDİN!", // 273
"ÇILGIN", // 274
"SERSEM", // 275
"BONUS", // 276
"SKOR", // 277
"REKOR {n}", // 278
"COMBO", // 279
"🎬 TAMAM! +{n}", // 280
"1 vuruş", // 281
"2 vuruş", // 282
"3 vuruş", // 283
"kırılmaz", // 284
"patlar", // 285
"yıldırım", // 286
"altın", // 287
"+top", // 288
"tampon", // 289
"portal", // 290
"★ KAOS SÜRÜMÜ ★", // 291
"Yeni oyun için tıkla veya boşluk", // 292
"← → / fare: raket • boşluk: fırlat • P/Esc: duraklat • T/R: tema • F: tam ekran", // 293
"Raketi hareket ettirerek vur: FALSO!   Uçtan vur: SMASH!", // 294
"⚠ Lanetler seni durdurmaya çalışacak — yoğunluk: Ayarlar → Lanetler", // 295
"topu fırlat: tıkla / boşluk", // 296
"Topu tünele sok · sarı +3 ve turuncu x3 küpleri raketle yakala", // 297
"YAPIŞ: bırakmak için tıkla / boşluk", // 298
"BÖLÜM {n} TAMAM!", // 299
"DURAKLATILDI", // 300
"devam: P veya tıkla", // 301
"OYUN BİTTİ", // 302
"Skor: {n}", // 303
"🏆 YENİ REKOR!", // 304
"Rekor: {n}", // 305
"Bölüm {level} · Süre {time}", // 306
"Tuğla {bricks} · En iyi combo ×{combo}", // 307
"Kapsül {powers} · Lanet {curses} · Boss {bosses}", // 308
"GÜNLÜK · en iyi {best} · seri {n}", // 309
"PRATİK — rekor ve kariyer sayılmadı", // 310
"Liderlik tablosu: #{n} ({name})", // 311
"menü için tıkla veya boşluk", // 312
"Efekt sesi", // 313
"Raket sesi", // 314
"Ekran sarsıntısı", // 315
"Zorluk", // 316
"Lanetler", // 317
"Lanet Paktı", // 318
"Dramaturg", // 319
"Hayalet koşu", // 320
"HP noktacıkları", // 321
"Zorluk yalnızca yeni oyunda uygulanır. Lanetler oyun sırasında rastgele gelen engellerdir (görünmez raket, karanlık, rüzgar…); aktifken kırılan tuğlalar ×1.5 puan verir. Efekt sesi arka plan müziğini etkilemez.", // 322
"Görünüm", // 323
"Top şekli", // 324
"Top izi", // 325
"Raket", // 326
"Tuğla stili", // 327
"Tuğla rengi", // 328
"Arka plan", // 329
"Parçacık", // 330
"Otomatik tema", // 331
"Müzik", // 332
"Müzik efektleri", // 333
"Şarkıya özel tema", // 334
"Arka plana müzik ya da sesli video koyunca efektler vuruşa ve frekanslara göre oynar. Her şarkı ilk 8 saniyede dinlenip karakterine göre (bas, hız, tiz, sakin, neon) kendi efekt setini ve adını alır; profil kaydedilir. \"Tam\" ayarında hafif vuruş flaşı da vardır, ışığa duyarlıysan \"Hafif\"i seç.", // 335
"🎲 Rastgele", // 336
"Pop", // 337
"Bip", // 338
"Lazer", // 339
"Tık", // 340
"Bas", // 341
"Zil", // 342
"Boing", // 343
"Pluck", // 344
"8-bit", // 345
"Açık", // 346
"Azaltılmış", // 347
"Kapalı", // 348
"Kolay", // 349
"Normal", // 350
"Zor", // 351
"Az", // 352
"Kâbus", // 353
"● Daire", // 354
"■ Kare", // 355
"◆ Elmas", // 356
"★ Yıldız", // 357
"○ Halka", // 358
"Uzun", // 359
"Gökkuşağı", // 360
"Parlak", // 361
"Köşeli", // 362
"Neon", // 363
"Düz", // 364
"Yuvarlak", // 365
"3D", // 366
"Cam", // 367
"Dayanıklılığa göre", // 368
"Yıldızlar", // 369
"Kar", // 370
"Kabarcık", // 371
"Matrix", // 372
"Synthwave ızgara", // 373
"Çok", // 374
"Aşırı", // 375
"Her bölümde yeni rastgele tema", // 376
"Hafif", // 377
"Tam", // 378
"RİTİM CANAVARI", // 379
"⏳ Şarkı analiz ediliyor…", // 380
"Web Audio yok", // 381
"✅ {n} bölüm üretildi.", // 382
"⚠️ Şarkı çözülemedi: {err}", // 383
"{bpm} BPM · {sec} sn · {n} bölüm", // 384
"boss: {name}", // 385
"Henüz şarkı seçilmedi. Bir şarkı seç; enerji, bas ve BPM'e göre bölüm üretilsin.", // 386
"▶ Şarkı bölümü sürüyor…", // 387
"▶ Şarkı bölümünü başlat", // 388
"🎵 ŞARKI TAMAM!", // 389
"Paylaşılan şarkı", // 390
"⚠️ Önce bir şarkı seç.", // 391
"📋 Bölüm kodu panoya kopyalandı.", // 392
"📥 Bölüm yüklendi — başlatabilirsin.", // 393
"⚠️ Geçersiz bölüm kodu.", // 394
"Sayfa", // 395
"Tahta", // 396
"Tuğla 1", // 397
"Tuğla 2", // 398
"Tuğla 3", // 399
"Patlayan", // 400
"Top", // 401
"Yazı", // 402
"Soluk yazı", // 403
"Vurgu", // 404
"Arka plan efekti", // 405
"Gece", // 406
"Gün Batımı", // 407
"Orman", // 408
"Gameboy", // 409
"Buz", // 410
"Şeker", // 411
"Klasik", // 412
"Lav", // 413
"Okyanus", // 414
"Synthwave", // 415
"Sakura", // 416
"Çöl", // 417
"Uzay", // 418
"Kahve", // 419
"Lavanta", // 420
"Vampir", // 421
"Kağıt", // 422
"Pastel", // 423
"Amber", // 424
"Sonbahar", // 425
"Aurora", // 426
"Siberpunk", // 427
"sıfat::Kızıl", // 428
"sıfat::Kozmik", // 429
"sıfat::Neon", // 430
"sıfat::Sisli", // 431
"sıfat::Altın", // 432
"sıfat::Buzlu", // 433
"sıfat::Elektrik", // 434
"sıfat::Kadife", // 435
"sıfat::Volkanik", // 436
"sıfat::Pastel", // 437
"sıfat::Gizemli", // 438
"sıfat::Tropik", // 439
"sıfat::Kutup", // 440
"sıfat::Dijital", // 441
"sıfat::Antik", // 442
"sıfat::Zehirli", // 443
"sıfat::Gece", // 444
"sıfat::Şafak", // 445
"sıfat::Fırtınalı", // 446
"sıfat::Kristal", // 447
"sıfat::Mistik", // 448
"sıfat::Retro", // 449
"sıfat::Yakut", // 450
"sıfat::Zümrüt", // 451
"sıfat::Safir", // 452
"sıfat::Bakır", // 453
"Nebula", // 454
"Rüya", // 455
"Kristal", // 456
"Fırtına", // 457
"Galaksi", // 458
"Bahar", // 459
"Vadi", // 460
"Gölge", // 461
"Mercan", // 462
"Yıldız", // 463
"Duman", // 464
"Şehir", // 465
"Ada", // 466
"Buzul", // 467
"Bataklık", // 468
"Gezegen", // 469
"Labirent", // 470
"Tapınak", // 471
"Kanyon", // 472
"Volkan", // 473
"ZİNCİR REAKSİYON!", // 474
"TÜNEL!", // 475
"{n} TOP", // 476
"🌪 TOP FIRTINASI!", // 477
"300 TOP: MAKSİMUM!", // 478
"FİNAL ZİNCİRİ!", // 479
"Congratulations", // 480
"You win!", // 481
"+3000 · en çok {n} top", // 482
"Kapat (Esc)", // 483
"Tüm oyun sesleri (arka plan medyası ayrı sürgüyle)", // 484
"🔇 Sesler kapalı", // 485
"🔊 Sesler açık", // 486
"Sıradaki tema (T)", // 487
"🎲 Tema", // 488
"Sonsuz rastgele tema (R)", // 489
"🖌️ Tema stüdyosu", // 490
"Temaları gez, düzenle, kaydet, paylaş", // 491
"⚙️ Ayarlar", // 492
"Ses, zorluk, lanetler, görünüm, müzik", // 493
"Tam ekran (F)", // 494
"Dil", // 495
"Görünümü varsayılana döndür", // 496
"En fazla {n} tema kaydedilebilir, önce birini sil.", // 497
"💾 \"{name}\" kaydedildi.", // 498
"🗑 \"{name}\" silindi.", // 499
"📋 Kod panoya kopyalandı.", // 500
"📥 \"{name}\" yüklendi — kalıcı olsun istersen Kaydet.", // 501
"⚠️ Geçersiz tema kodu.", // 502
"Çaylak", // 503
"Bot sayısı", // 504
"Bot seviyesi", // 505
"Süre", // 506
"Saldırı hedefi", // 507
"Herkes 3 canla aynı anda başlar. Tuğla kırdıkça saldırı enerjin dolar (combo ×2, bölüm +6, boss +12, ÇILGIN MOD +5); dolunca seçtiğin hedefe bir lanet gider. KALKAN gelen saldırıyı engeller. Süre bitince en yüksek skor, ya da son ayakta kalan kazanır.", // 508
"Ek bot", // 509
"Dereceli", // 510
"Oyuncu", // 511
"🏅 DERECELİ!", // 512
"⚔ KAPIŞMA!", // 513
"🏆 KAZANDIN!", // 514
"{name} elendi", // 515
"{name} elendi ☠", // 516
"{from} ⚔ {to}", // 517
"{name} bağlantısı koptu", // 518
"⚔ SALDIRI → {name}", // 519
"🛡 SALDIRI ENGELLENDİ ({name})", // 520
"{name} saldırısı boşa gitti", // 521
"BAŞLA!", // 522
"kod türü yanlış", // 523
"✅ Odaya bağlandın, oda sahibi başlatınca maç başlayacak.", // 524
"⚠️ {name} ayrıldı.", // 525
"Bir oyuncu", // 526
"⚠️ Oda sahibiyle bağlantı koptu.", // 527
"oda dolu (en çok 4 oyuncu)", // 528
"bu cevap koduna ait davet yok", // 529
"bu davet zaten kullanıldı", // 530
"⚠️ Önce en az bir arkadaşın bağlanmalı.", // 531
"Misafir", // 532
"✅ {name} bağlandı.", // 533
"Rakip", // 534
"⚔ Hazır ol…", // 535
"⚔ Bitti", // 536
"dereceli çevrim içi maç", // 537
"çevrim içi maç", // 538
"dereceli botlarla maç", // 539
"botlarla maç", // 540
"insan", // 541
"sen", // 542
"(sen)", // 543
"Bölüm {n}", // 544
"⚠ lanetli", // 545
"⚔ Rekabet", // 546
"Dereceli maç, botlarla ya da arkadaşlarla kapış, liderlik tablosu", // 547
"Henüz skor yok — bir oyun bitir!", // 548
"Bölüm", // 549
"🏠 Oda kuruldu. \"Davet kodu oluştur\"a bas, kodu arkadaşına gönder.", // 550
"🔗 Arkadaşının davet kodunu yapıştır, cevap kodunu ona geri gönder.", // 551
"Odadan ayrıldın.", // 552
"⏳ Kod hazırlanıyor…", // 553
"📋 Davet kodu panoya kopyalandı — arkadaşına gönder, cevap kodunu aşağı yapıştır.", // 554
"Davet kodunu kopyalayıp arkadaşına gönder, gelen cevap kodunu aşağı yapıştır.", // 555
"Davet oluşturulamadı", // 556
"📋 Cevap kodu panoya kopyalandı — oda sahibine gönder.", // 557
"Cevap kodunu kopyalayıp oda sahibine gönder.", // 558
"Davet kodu geçersiz", // 559
"⏳ Bağlanılıyor…", // 560
"⚠️ Cevap kodu geçersiz: {err}", // 561
"Emin misin? Tekrar tıkla", // 562
"Bu tabloyu temizle", // 563
"rakiplerin hazır…", // 564
"ELENDİN", // 565
"{n}. OLDUN", // 566
"Skorun: {n}", // 567
"liderlik #{n}", // 568
"Maç sürüyor… izliyorsun", // 569
"maç bitince sonuçlar burada", // 570
"Karışık", // 571
"2 dk", // 572
"3 dk", // 573
"5 dk", // 574
"Lider", // 575
"Rastgele", // 576
"Son sıradaki", // 577
"Yok", // 578
"Açık (herkesin puanı değişir)", // 579
"🗓 HAFTALIK TOHUM", // 580
"son {score} puan (bölüm {level})", // 581
"Tohum: {key}", // 582
"Aynı bölümler, aynı kapsül sırası · en iyi {best} · deneme {n}", // 583
"🗓 Koşu sürüyor...", // 584
"🗓 Bu haftanın tohumunu oyna", // 585
"⚠️ Önce haftalık bir koşu tamamla.", // 586
"📋 Sonuç kodu panoya kopyalandı.", // 587
"📜 LANET PAKTI", // 588
"bölüm başında · koşu boyunca sürer", // 589
"Pakt yok", // 590
"🔊 ses için bir kez tıkla", // 591
"🎬 Video", // 592
"🎵 Müzik", // 593
"✕ Kapat", // 594
"💀 SON TOP BAHSİ", // 595
"Son canın da gitti. Devam etmek istersen bedeli var: 1 canla dönersin ve hemen bir lanet yersin.", // 596
"❤️ 1 canla devam et", // 597
"+ lanet", // 598
"🏁 Bitir", // 599
"skorunu kaydet", // 600
"Hazır + kayıtlı", // 601
"Rastgele öneriler", // 602
"🎲 Rastgele tema (R)", // 603
"🔄 Yeni öneriler", // 604
"Düzenle", // 605
"Tema adı", // 606
"💾 Kaydet", // 607
"🗑 Sil", // 608
"Paylaş", // 609
"📤 Kodu al", // 610
"📥 Yükle", // 611
"Hazır ya da rastgele bir temayı düzenlemek onu bozmaz; Kaydet ile kendi temana dönüşür. T: sıradaki tema · R: rastgele tema.", // 612
"Oyuncu adı", // 613
"Dereceli lig", // 614
"🏅 Dereceli maç (3 bot · 3 dk)", // 615
"📊 Kariyer ve başarımlar", // 616
"Dereceli maçta rakip botların puanı seninkine yakındır ve güçleri puanlarından gelir: kazandıkça rakipler zorlaşır, kaybettikçe kolaylaşır. Puan çok oyunculu Elo ile hesaplanır: önünde bitirdiğin her rakip kazandırır, arkanda kaldığın her rakip kaybettirir; güçlü rakibi geçmek daha çok kazandırır. İlk 5 maç yerleştirmedir (puan iki kat hızlı oynar). Bitmemiş dereceli maçı bırakmak (yeni maç, odadan ayrılma, sayfayı kapatma) son sıra sayılır. Arkadaşlarla maçta oda sahibi \"Dereceli\"yi açarsa herkesin puanı değişir.", // 617
"Botlarla kapışma (dostluk, puansız)", // 618
"⚔ Botlarla kapışmayı başlat", // 619
"Arkadaşlarla (çevrim içi)", // 620
"Sunucu yok: oyunlar doğrudan birbirine bağlanır (WebRTC). Oda sahibi her arkadaşı için bir davet kodu üretir, arkadaşı bir cevap kodu üretip geri gönderir. Kodları istediğiniz mesajlaşma uygulamasıyla paylaşın. Bağlantı kurulurken adres öğrenmek için Google'ın genel STUN sunucusu kullanılır; oyun verisi oradan geçmez. En çok 4 oyuncu; çevrim içi maçta duraklatma yoktur.", // 621
"🏠 Oda kur", // 622
"🔗 Odaya katıl", // 623
"✕ Ayrıl", // 624
"➕ Davet kodu oluştur", // 625
"Bağla", // 626
"⚔ Maçı başlat", // 627
"Cevap kodu oluştur", // 628
"Liderlik tablosu", // 629
"İstatistikler", // 630
"Son maçlar", // 631
"Başarımlar", // 632
"Kariyer bu cihazda saklanır. Sayaçlar her oyunda (klasik ve kapışma) canlı artar, başarımlar açıldığı anda tuvalin üstünde duyurulur.", // 633
"Koleksiyon", // 634
"🔮 Lanetler", // 635
"🧱 Tuğlalar", // 636
"👹 Bosslar", // 637
"Günlük meydan okuma", // 638
"Günde tek deneme · 1 can · Kabus lanetleri · +%15 hız. Deneme başladığı an kullanılmış sayılır.", // 639
"🗓 Haftalık Kaos Tohumu", // 640
"📤 Sonuç kodu", // 641
"Her hafta aynı tohum: bölümler, kapsüller ve lanetler aynı sırayla gelir. Pakt, dramaturg, hayalet ve son top bahsi kapalıdır; herkes aynı koşuyu oynar.", // 642
"🎵 Şarkıdan Bölüm", // 643
"🎵 Şarkı seç", // 644
"📤 Bölüm kodu", // 645
"📥 Kodu yükle", // 646
"Şarkının BPM'i, bas ve tiz enerjisi 3 bölüme dönüşür; güçlü bir final varsa son bölüme boss eklenir. Aynı şarkı her zaman aynı bölümü üretir. Bölüm kodu arkadaşlarınla paylaşılabilir.", // 647
"🌀 Tünel Fırtınası", // 648
"🌀 Tünel Fırtınası'nı oyna", // 649
"Binlerce mavi piksel tuğla ve içinden geçen kırılmaz çelik L ve sarmal tüneller. Topu tünele sok: çıkışa taşınır, duvarı içeriden oyar, zincir reaksiyon başlar. Çıkışlardaki sarı +3 ve turuncu x3 küpleri raketle yakala, 300 topa kadar fırtına. Klasik oyunda 12. bölüm; buradan her zaman pratik olarak açık.", // 650
"Bölüm seçimi (pratik)", // 651
"Pratik koşularda rekor, liderlik tablosu, kariyer ve başarımlar sayılmaz. Bölümler, klasik oyunda ulaştığın en ileri bölüme kadar açılır.", // 652
"👻 Hayalet Koşu", // 653
"📤 Hayalet kodu al", // 654
"Klasik koşunda en iyi skorun hayaleti kaydedilir; yeni koşuda yarı saydam rakip olarak aynı tempoyu gösterir. Kodla arkadaşına gönderebilirsin.", // 655
"Brick Breaker oyun alanı", // 656
"Tarayıcı sesi ilk tıklamadan sonra açar", // 657
"Arka planı kapat", // 658
"Arka plan ses seviyesi", // 659
"Son Top Bahsi", // 660
"Ayarlar", // 661
"Tema stüdyosu", // 662
"BB1:... tema kodunu buraya yapıştır", // 663
"Rekabet", // 664
"Davet kodu burada belirecek", // 665
"Arkadaşının gönderdiği cevap kodu", // 666
"Oda sahibinin davet kodu", // 667
"Cevap kodu burada belirecek", // 668
"Kariyer", // 669
"Meydan okuma", // 670
"BBW1:... sonuç kodunu buraya yapıştır", // 671
"BBS1:... bölüm kodunu buraya yapıştır", // 672
"BBG1:... hayalet kodunu buraya yapıştır", // 673
"Brick Breaker AI — kaos, lanetler, boss'lar, sonsuz temalar, müzikle senkron efektler ve çevrim içi kapışma.", // 674
"Yeni tür tuğla", // 675
"Yeni Nesil", // 676
"Yeni türden bir tuğla kır", // 677
"Çeşitlilik Ustası", // 678
"Yeni türlerden toplam 100 tuğla kır", // 679
"Yenilenen", // 680
"Yarım kalan tuğla zamanla 1 canını geri kazanır.", // 681
"Yenilenen bir tuğlayı kır.", // 682
"Kalkanlı", // 683
"Kalkanını top yavaşça aşındırır; ateş ve lazer hemen söker.", // 684
"Kalkanlı bir tuğla kır.", // 685
"İkiz", // 686
"Biri kırılınca eşi de dağılır.", // 687
"İkiz tuğlaları kır.", // 688
"Kırılınca komşularını dondurur (+2 can); ateşte anında erir.", // 689
"Buz tuğlasını kır.", // 690
"Virüs", // 691
"Komşularını sürekli güçlendirir; hızla yok et.", // 692
"Virüs tuğlasını kır.", // 693
"Şifacı", // 694
"Boss'u ve komşularını onarır; önce onu vur.", // 695
"Şifacı tuğlayı kır.", // 696
"DÜŞEN DUVAR", // 697
"DÜŞEN", // 698
"3 elektrik tuğlası kır", // 699
"2 ikiz tuğla kır", // 700
"Virüs tuğlalarını temizle", // 701
"SERT TUĞLALAR", // 702
"Sıradan tuğlalar +1 can, puan ×1.35", // 703
"VİRÜS SALGINI", // 704
"Her bölümde 2 virüs tuğla, puan ×1.3", // 705
"KALKAN KIRILDI!", // 706
"RİTİM!", // 707
"İKİZ!", // 708
"DONDU!", // 709
"ENFEKTE!", // 710
"ŞİFA", // 711
"Silgi", // 712
"Elektrik", // 713
"Benim bölümüm", // 714
"✏️ BÖLÜM TAMAM!", // 715
"Bu sıra sağa sola kayar", // 716
"{n} tuğla · {s} özel", // 717
"en az bir kırılabilir tuğla koy", // 718
"📂 {name} açıldı.", // 719
"Henüz kayıtlı bölüm yok.", // 720
"✏️ Bölüm Editörü", // 721
"{n}. bölümü şablon olarak aç", // 722
"⚠️ En az bir kırılabilir tuğla koy.", // 723
"💾 {name} kaydedildi.", // 724
"⚠️ Önce bölüme bir ad ver.", // 725
"⚠️ En çok {n} bölüm kaydedilebilir; önce birini sil.", // 726
"🗑 {name} silindi.", // 727
"⚠️ Bu adla kayıtlı bölüm yok.", // 728
"🔗 Bağlantı panoya kopyalandı.", // 729
"📥 Bölüm yüklendi — test edebilirsin.", // 730
"✏️ Editör", // 731
"Kendi bölümünü çiz, test et ve paylaş", // 732
"🔗 Paylaşılan bölüm yüklendi — ▶ Test et ile oyna.", // 733
"Bölüm adı", // 734
"🪞 Ayna", // 735
"↶ Geri al", // 736
"🧹 Temizle", // 737
"Boss", // 738
"Şablon", // 739
"▶ Test et", // 740
"Kayıtlı bölümlerim", // 741
"🔗 Bağlantı", // 742
"Paletten tuğla seç, ızgaraya tıkla ya da sürükle; sağ tık siler. Sıra sonundaki ↔ o sırayı kaydırır, Ayna açıkken çizdiğin sağ yarıya yansır. Boss seçilirse ilk 5 sıra boss'a ayrılır. Test koşuları rekor ve kariyere sayılmaz. Bağlantıyla açılan bölüm doğrudan editöre yüklenir.", // 743
"Bölüm editörü", // 744
"BBL1:... bölüm kodunu ya da bağlantısını buraya yapıştır", // 745
"⚡ Düşük grafik moduna geçildi", // 746
"oyun takılıyordu · Ayarlar → Grafik kalitesi", // 747
"Yeni oyun için dokun", // 748
"topu fırlat: dokun", // 749
"Grafik kalitesi", // 750
"Dokunmatik", // 751
"Otomatik grafik kalitesi oyun takılırsa kendiliğinden düşük kaliteye geçer (daha az parçacık, iz ve gölge yok). Dokunmatikte \"Kaydırarak\" seçilirse raket parmağın altına zıplamaz, parmağın kaydığı kadar gider: tuvalin her yerinden oynanır, parmak raketi örtmez.", // 752
"Otomatik", // 753
"Yüksek", // 754
"Düşük (yavaş cihaz)", // 755
"Parmağı izler", // 756
"Kaydırarak", // 757
"Renk körü dostu", // 758
"Parlama ve yanıp sönme", // 759
"Renk körü dostu: tuğla dayanıklılık renkleri renk körlüğünde de ayırt edilen bir paletle (açık mavi, sarı, kızıl) çizilir ve her tuğlada kalan vuruş noktacıkları görünür. Parlama azaltılınca müzik flaşı kapanır, ÇILGIN MOD renkleri yavaş döner, hızlı yanıp sönmeler sabit renge döner.", // 760
"⚽ CR7 KORİDORU", // 761
"YÖN", // 762
"⚽ SIUUU!", // 763
"⚽ CR7 Koridoru'nu oyna", // 764
"🔹 MİKRO DUVAR", // 765
"Orta", // 766
"🔹 Mikro Duvar'ı oyna", // 767
"🧩 MOZAİK DUVAR", // 768
"💠 ADALAR DUVARI", // 769
"🧩 Mozaik Duvar'ı oyna", // 770
"💠 Adalar Duvarı'nı oyna", // 771
"ZIK ZIK TOP", // 772
"ZIK ZIK", // 773
"BOMBA", // 774
"Yenilen duvar", // 775
"İlk Duvar", // 776
"Bir piksel duvar kazan", // 777
"Duvarlar Kralı", // 778
"10 piksel duvar kazan", // 779
"Turkuaz", // 780
"Gül Bahçesi", // 781
"Derin Deniz", // 782
"🔥 Hayatta Kalma", // 783
"🔥 HAYATTA KALMA", // 784
"GECE BEKÇİSİ", // 785
"NEON LORD", // 786
"Tünel", // 787
"TÜNEL USTASI", // 788
"BUZ KRALİÇESİ", // 789
"KAN KONTU", // 790
"KUZEY IŞIĞI", // 791
"DERİNLİK DEVRİ", // 792
"SİBER İMPARATOR", // 793
"DÜNYA {n} TAMAM!", // 794
"🌍 TUR TAMAMLANDI!", // 795
"🗺️ Kampanya'yı aç", // 796
"Kampanya", // 797
"🗺️ Kampanya", // 798
"Önce {n}. dünyayı bitir", // 799
"İlk Dünya", // 800
"Kampanyada bir dünyayı bitir", // 801
"Turun Yarısı", // 802
"Kampanyada 4 dünyayı bitir", // 803
"Tur Şampiyonu", // 804
"Kampanyayı baştan sona bitir", // 805
"NOT SO FAST — CORE/BREAK", // 806
"ALL CLEAR!", // 807
"🟠 Core/Break'i oyna", // 808
];
const I18N_DATA = {};
