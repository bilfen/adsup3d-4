# Bilfen AD'S UP — Ücretsiz Gerçek 3B

Tek bir görselden ön, yan ve arka yüzleri bulunan, dokulu gerçek bir `.glb` model üretir. Model sunucuda değil öğrencinin bilgisayarında **WebGPU** ile çalışır; API anahtarı, ücretli servis ve kullanıcı hesabı gerekmez.

## Kullanım

1. Güncel Chrome veya Edge ile siteyi açın.
2. Tek nesneli, sade arka planlı bir PNG/JPG seçin.
3. **Gerçek 3B Model Üret** düğmesine basın.
4. İlk kullanımda yaklaşık 2,1 GB model indirilir ve tarayıcı önbelleğine alınır.
5. Üretilen modeli döndürün; `.glb` veya 10 saniyelik `.webm` video olarak indirin.

## Gereksinimler

- WebGPU destekli güncel Chrome veya Edge
- En az 8 GB sistem belleği; ayrı veya güçlü tümleşik GPU önerilir
- İlk çalıştırmada yaklaşık 2,1 GB indirme
- Üretim süresi donanıma göre yaklaşık 30 saniye ile birkaç dakika

Telefonlar, eski bilgisayarlar ve WebGPU kapalı tarayıcılar bu ağır modeli çalıştıramayabilir. Uygulama bu durumda sahte bir kabartma üretmek yerine açık bir uyumluluk mesajı gösterir.

## Gizlilik

Öğrenci görseli tarayıcıdan dışarı gönderilmez. Yalnızca açık model ağırlıkları ve yardımcı geometri dosyaları indirilir. Üretilen GLB ve video cihazda oluşturulur.

## Teknoloji ve lisans

- [SF3D WebGPU](https://github.com/lyonsno/sf3d-webgpu): Stable Fast 3D'nin tarayıcı/WebGPU portu
- Model ağırlıkları: [BasinShapers/sf3d-webgpu-weights](https://huggingface.co/BasinShapers/sf3d-webgpu-weights)
- Model lisansı: Stability AI Community License; eğitim, araştırma ve yıllık geliri 1 milyon ABD dolarının altındaki ticari kullanımlar için ücretsizdir.
- Görüntüleme: Google `<model-viewer>`

Bu sürüm Tencent/Hunyuan, ücretli API veya üçüncü taraf üretim kuyruğu kullanmaz.


> Kaynak kod: [ahmetgedik67/adsup3d-2](https://github.com/ahmetgedik67/adsup3d-2) (Ahmet Gedik). Bilfen AD'S UP için yayına alındı.
