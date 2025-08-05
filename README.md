<p align="center">
  <img src="https://raw.githubusercontent.com/r02092/oc2025/main/materials/logo.svg" width="400"/>
</p>

# 2025年度オープンキャンパス作品
詳しい解説をブログに書いています  
→[オープンキャンパスの手相占い作品を支える技術 | Krlab](https://krlab.kochi-tech.ac.jp/?p=1696)
- カメラを使って手のひらを撮影し、丘の大きさの情報を画像処理によって得て、それに基づいて手相占いをする
- 占いを軽量なローカルLLMでおこない、結果をVOICEVOXを使って四国めたんに読み上げさせる

![説明用文書](https://raw.githubusercontent.com/r02092/oc2025/main/materials/print-outline.svg)
## 使用するソフト・言語・ライブラリなど
![構成図](https://raw.githubusercontent.com/r02092/oc2025/main/materials/kosei.svg)
- Arduino
- Google Chrome
  - CSS
  - HTML
  - JavaScript
- LuaLaTeX
  - LuaTeX-ja
  - luacode
  - Ti*k*Z
- Morisawa Fonts
- Node.js
  - npm
  - TypeScript
  - webpack
  - Three.js
  - node-qrcode
- Ollama
- Python
  - NumPy
  - OpenCV
  - Selenium
  - pySerial
- VOICEVOX
- Windows
## 使用するモデル・素材
- [Qwen3-30B-A3B](https://huggingface.co/Qwen/Qwen3-30B-A3B)
- [四国めたん立ち絵素材](https://nico.ms/im10791276)（[東北ずん子・ずんだもんプロジェクトガイドライン](https://zunko.jp/guideline.html)準拠）