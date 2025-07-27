import {Ollama} from "ollama/browser";
type Eyes = "close" | "lookup" | "white";
declare global {
	interface DocumentEventMap {
		"predict": CustomEvent<{
			albedo: string;
			normal: string;
			score: number[];
		}>;
	}
}
function changeEyes(eyename: Eyes) {
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
window.addEventListener("resize", () => {
	for (const element of document.querySelectorAll<HTMLElement>("#metan > img")) {
		element.style.left = "calc(50% - " + (<HTMLImageElement>document.getElementById("body")).getBoundingClientRect().width / 2 + "px)";
		element.style.top = "calc(50% - " + (<HTMLImageElement>document.getElementById("body")).getBoundingClientRect().height / 2 + "px)";
	}
});
document.addEventListener("ready", () => {
	(<HTMLElement>document.getElementById("message")).innerText = "手のひらを上に向けて、指同士の間に隙間が無くなるようにして、手を見せてほしいわ。";
});
document.addEventListener("predict", async (e: CustomEvent) => {
	(<HTMLImageElement>document.getElementById("arms")).src = "img/metan_arms_loading.png";
	(<HTMLImageElement>document.getElementById("mouth")).style.display = "none";
	changeEyes(Math.random() < .5 ? "close" : "lookup");
	if (eyes === "close") clearTimeout(blink);
	(<HTMLImageElement>document.getElementById("iris")).style.display = "none";
	(<HTMLElement>document.getElementById("message")).innerText = "少し待ってちょうだい。";
	(<HTMLImageElement>document.getElementById("albedo")).src = "data:image/webp;base64," + e.detail.albedo;
	(<HTMLImageElement>document.getElementById("normal")).src = "data:image/webp;base64," + e.detail.normal;
	(<HTMLImageElement>document.getElementById("albedo")).style.visibility = "visible";
	(<HTMLImageElement>document.getElementById("normal")).style.visibility = "visible";
	(<HTMLElement>document.getElementById("scorev")).innerText = e.detail.score[0];
	(<HTMLElement>document.getElementById("scorem")).innerText = e.detail.score[1];
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
		vowel: "a" | "i" | "u" | "e" | "o" | "n" | "cl"
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
	(<HTMLElement>document.getElementById("message")).innerText = text;
	(<HTMLImageElement>document.getElementById("arms")).src = "img/metan_arms_normal.png";
	(<HTMLImageElement>document.getElementById("mouth")).style.removeProperty("display");
	(<HTMLImageElement>document.getElementById("iris")).style.removeProperty("display");
	if (eyes === "close") blink = setTimeout(closeEyes, Math.random() * 11000 + 4000);
	changeEyes("white");
	audio.play();
});
let eyes: Eyes;
changeEyes("white");
let blink = setTimeout(closeEyes, Math.random() * 11000 + 4000);