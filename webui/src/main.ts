import {Ollama} from "ollama/browser";
function changeEyes(eyename: string) {
	eyes = eyename;
	(<HTMLImageElement>document.getElementById("eyes")).src = "img/metan_eyes_" + eyes + ".png";
}
function closeEyes() {
	(<HTMLImageElement>document.getElementById("eyes")).src = "img/metan_eyes_close.png";
	(<HTMLImageElement>document.getElementById("iris")).style.display = "none";
	blink = setTimeout(openEyes, Math.random() * 50 + 50);
}
function openEyes() {
	(<HTMLImageElement>document.getElementById("eyes")).src = "img/metan_eyes_" + eyes + ".png";
	if (eyes !== "lookup") (<HTMLImageElement>document.getElementById("iris")).style.removeProperty("display");
	blink = setTimeout(closeEyes, Math.random() * 11000 + 4000);
}
(<HTMLImageElement>document.getElementById("body")).addEventListener("load", () => {
	for (const element of document.getElementsByTagName("img")) {
		element.style.left = "calc(50% - " + (<HTMLImageElement>document.getElementById("body")).getBoundingClientRect().width / 2 + "px)";
		element.style.top = "calc(50% - " + (<HTMLImageElement>document.getElementById("body")).getBoundingClientRect().height / 2 + "px)";
	}
});
document.addEventListener("predict", async () => {
	(<HTMLImageElement>document.getElementById("arms")).src = "img/metan_arms_loading.png";
	(<HTMLImageElement>document.getElementById("mouth")).style.display = "none";
	changeEyes(Math.random() < 0.5 ? "close" : "lookup");
	if (eyes === "close") clearTimeout(blink);
	(<HTMLImageElement>document.getElementById("iris")).style.display = "none";
	const ollama = new Ollama({host: "http://" + process.env.OC2025_OLLAMA_HOSTNAME + ":11434"});
	const text: string = (await ollama.chat({
		model: "qwen3:30b-a3b",
		messages: [{
			role: "user",
			content: `/nothink
必ずタメ口で、必要に応じて語尾に「かしら」や「わよ」を付けて、高飛車な口調で中二病っぽく話してほしいわ。いくつかの例文を以下に示すわね。
* ……ふふっ。わたくしの家にはテレビもなければ携帯もないわ。
* あ、悪魔に魂を捧げている……。
* あとで一食おごりなさいよ。
* じゃ、そういうことなら早く行きましょう。
* そう。だから、できるだけ誰にも邪魔されない場所で、他人の声に気付かないほど真剣に戦っているの。
* ちょっと！？　そう見えてくるからやめてくれない！？
以上の要件に則ったうえで、高知県について教えて。ただし、100文字程度のプレーンテキストで出力して。`
		}]
	})).message.content.replace(/^<think>[\S\s]*<\/think>\s*/, "");
	const paramsAq = new URLSearchParams();
	paramsAq.append("text", text);
	paramsAq.append("speaker", "2");
	const audioQueryJson = await (await fetch("http://localhost:50021/audio_query?" + paramsAq.toString(), {
		method: "POST"
	})).text();
	const audioQuery = JSON.parse(audioQueryJson);
	let lipSyncData: {
		time: number
		vowel: string
	}[] = [];
	let time = audioQuery["prePhonemeLength"];
	for (const accentPhrase of audioQuery["accent_phrases"]) {
		for (const mora of accentPhrase["moras"]) {
			if (mora["vowel"] != "cl") lipSyncData.push({
				time: time * 1000,
				vowel: mora["vowel"].toLowerCase()
			});
			time += mora["consonant_length"] + mora["vowel_length"];
		}
		if (accentPhrase["pause_mora"]) time += accentPhrase["pause_mora"]["vowel_length"];
	}
	lipSyncData.push({
		time: time * 1000,
		vowel: "n"
	});
	const paramsSynth = new URLSearchParams();
	paramsSynth.append("speaker", "2");
	const audio = new Audio(URL.createObjectURL(await (await fetch("http://localhost:50021/synthesis?" + paramsSynth.toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: audioQueryJson
	})).blob()));
	audio.ontimeupdate = () => {
		function loop() {
			if (lipSyncData[0].time <= new Date().getTime() - start) (<HTMLImageElement>document.getElementById("mouth")).src = "img/metan_mouth_" + lipSyncData.shift()!.vowel + ".png"
			if (lipSyncData.length) {
				requestAnimationFrame(loop);
			} else {
				fetch("end_speech");
			}
		}
		const start = new Date().getTime() - audio.currentTime * 1000;
		loop();
		audio.ontimeupdate = null;
	}
	(<HTMLImageElement>document.getElementById("text")).innerText = text;
	(<HTMLImageElement>document.getElementById("arms")).src = "img/metan_arms_normal.png";
	(<HTMLImageElement>document.getElementById("mouth")).style.removeProperty("display");
	(<HTMLImageElement>document.getElementById("iris")).style.removeProperty("display");
	if (eyes === "close") blink = setTimeout(closeEyes, Math.random() * 11000 + 4000);
	changeEyes("white");
	audio.play();
});
let eyes: string;
changeEyes("white");
let blink = setTimeout(closeEyes, Math.random() * 11000 + 4000);