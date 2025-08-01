import * as QRCode from "qrcode";
import * as THREE from "three";
import {Ollama} from "ollama/browser";
type Eyes = "close" | "lookup" | "white";
declare global {
	interface DocumentEventMap {
		"predict": CustomEvent<{
			albedo: string;
			normal: string;
			score: number[];
		}>,
		"ss": CustomEvent<{
			fn: string;
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
async function speak(audioQueryJson: string, audioRes: Response, text: string, sendEvent: boolean = false) {
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
	const audio = new Audio(URL.createObjectURL(await (audioRes).blob()));
	audio.ontimeupdate = () => {
		function loop() {
			if (lipSyncData[0].time <= new Date().getTime() - start) (<HTMLImageElement>document.getElementById("mouth")).src = "img/metan_mouth_" + lipSyncData.shift()!.vowel + ".png"
			if (lipSyncData.length) {
				requestAnimationFrame(loop);
			} else if (sendEvent) {
				fetch("event/end_speech");
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
}
async function speak_file(fn: string, text: string) {
	speak(await (await fetch("speak/" + fn + ".json")).text(), await fetch("speak/" + fn + ".wav"), text, false);
}
window.addEventListener("resize", () => {
	for (const element of document.querySelectorAll<HTMLElement>("#metan > img")) {
		element.style.left = "calc(50% - " + (<HTMLImageElement>document.getElementById("body")).getBoundingClientRect().width / 2 + "px)";
		element.style.top = "calc(50% - " + (<HTMLImageElement>document.getElementById("body")).getBoundingClientRect().height / 2 + "px)";
	}
});
document.addEventListener("ready", () => {
	(<HTMLElement>document.getElementById("message")).innerText = "手のひらを上に向けて、指同士の間に隙間が無くなるようにして、手を見せてほしいわ。左手ならクリック、右手ならスペースキーを押して。";
});
document.addEventListener("predict", async (e: CustomEvent) => {
	(<HTMLImageElement>document.getElementById("arms")).src = "img/metan_arms_loading.png";
	(<HTMLImageElement>document.getElementById("mouth")).style.display = "none";
	changeEyes(Math.random() < .5 ? "close" : "lookup");
	if (eyes === "close") clearTimeout(blink);
	(<HTMLImageElement>document.getElementById("iris")).style.display = "none";
	speak_file("please_wait", "少し待ってちょうだい。");
	const albedoUrl = "data:image/webp;base64," + e.detail.albedo;
	const normalUrl = "data:image/webp;base64," + e.detail.normal;
	(<HTMLImageElement>document.getElementById("albedo")).src = albedoUrl;
	(<HTMLImageElement>document.getElementById("normal")).src = normalUrl;
	(<HTMLImageElement>document.getElementById("albedo")).style.visibility = "visible";
	(<HTMLImageElement>document.getElementById("normal")).style.visibility = "visible";
	const width = 800;
	const height = 600;
	const renderer = new THREE.WebGLRenderer({
		canvas: document.getElementsByTagName("canvas")[0]
	});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height, false);
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(45, width / height);
	camera.position.set(0, 0, 7);
	const loader = new THREE.TextureLoader();
	const box = new THREE.Mesh(
		new THREE.BoxGeometry(4, 3, 4),
		new THREE.MeshPhongMaterial({
			color: 0xffffff,
			map: loader.load(albedoUrl),
			normalMap: loader.load(normalUrl),
			normalScale: new THREE.Vector2(1, -1)
		})
	);
	scene.background = new THREE.Color(0x7f7f7f);
	scene.add(box);
	scene.add(new THREE.AmbientLight(0xffffff));
	const pointLight = new THREE.PointLight(0xffffff, 99);
	pointLight.position.set(0, 0, 5);
	scene.add(pointLight);
	let count = 0;
	function tick() {
		renderer.render(scene, camera);
		count++;
		box.rotation.y += .005;
		pointLight.position.y = 4 * Math.sin(count / 99);
		requestAnimationFrame(tick);
	}
	tick();
	renderer.render(scene, camera);
	document.getElementsByTagName("canvas")[0].style.visibility = "visible";
	(<HTMLElement>document.getElementById("scorev")).innerText = e.detail.score[0];
	(<HTMLElement>document.getElementById("scorem")).innerText = e.detail.score[1];
	const type: number[] = [0, 0];
	for (let i = 0; i < 2; i++) {
		if (e.detail.score[i] < (i ? 110000 : 230000)) {
			type[i] = 0;
		} else if (e.detail.score[i] < (i ? 150000 : 260000)) {
			type[i] = 1;
		} else {
			type[i] = 2;
		}
	}
	let prompt: string = "/nothink\n手相占いにおいて";
	for (let i = 0; i < 2; i++) {
		prompt += "、" + (i ? "月" : "金星") + "丘" + (i && type[0] === type[1] ? "も" : "が");
		switch (type[i]) {
			case 0:
				prompt += "あまり目立た" + (i ? "ない" : "ず");
				break;
			case 1:
				prompt += "目立つけど、少し控えめであ" + (i ? "る" : "り");
				break;
			case 2:
				prompt += "とても目立ってい" + (i ? "る" : "て");
		}
	}
	prompt += `人は、どのような人だと思われるかしら？
必要に応じて語尾に「かしら」や「わよ」を付けて、必ずタメ口で高飛車な口調で、その人自身に話すように答えてほしいわ。
ただし、金星丘や月丘などの手相の用語は使わないで、二人称は「アンタ」とし、100文字程度のプレーンテキストで出力して。`
	const ollama = new Ollama({host: "http://" + process.env.OC2025_OLLAMA_HOSTNAME + ":11434"});
	const text: string = (await ollama.chat({
		model: "qwen3:30b-a3b",
		messages: [{
			role: "user",
			content: prompt
		}]
	})).message.content.replace(/^<think>[\S\s]*<\/think>\s*/, "").replace("あんた", "アンタ").replace(/([。？])(かしら|わよ)[。？]/, "$1"); // <think>タグと言葉遣いの修正
	const paramsAq = new URLSearchParams();
	paramsAq.append("text", text);
	paramsAq.append("speaker", "2");
	const audioQueryJson = await (await fetch("http://localhost:50021/audio_query?" + paramsAq.toString(), {
		method: "POST"
	})).text();
	const paramsSynth = new URLSearchParams();
	paramsSynth.append("speaker", "2");
	speak(audioQueryJson, await fetch("http://localhost:50021/synthesis?" + paramsSynth.toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: audioQueryJson
	}), text, true);
});
document.addEventListener("ss", async (e: CustomEvent) => {
	(<HTMLImageElement>document.getElementById("qrimg")).src = await QRCode.toDataURL(process.env.OC2025_DOWNLOAD_PATH + e.detail.fn, {
		scale: 1
	});
	(<HTMLElement>document.getElementById("qr")).style.removeProperty("opacity");
	(<HTMLElement>document.getElementById("spacekey")).style.animation = "blink 1s ease-in-out infinite alternate";
	showQr = true;
});
document.addEventListener("keydown", (e: KeyboardEvent) => {
	if (e.key === " ") {
		fetch("event/press_space");
		if (showQr || showError) document.dispatchEvent(new CustomEvent("ready"));
		if (showQr) {
			(<HTMLElement>document.getElementById("scorev")).innerText = "";
			(<HTMLElement>document.getElementById("scorem")).innerText = "";
			(<HTMLImageElement>document.getElementById("albedo")).style.visibility = "hidden";
			(<HTMLImageElement>document.getElementById("normal")).style.visibility = "hidden";
			document.getElementsByTagName("canvas")[0].style.visibility = "hidden";
			(<HTMLElement>document.getElementById("qr")).style.opacity = "0";
			(<HTMLElement>document.getElementById("spacekey")).style.removeProperty("animation");
			showQr = false;
		}
	}
});
document.addEventListener("click", () => {
	fetch("event/click");
});
document.addEventListener("failure", () => {
	speak_file("failure", "申し訳ないけど、手のひらを認識できなかったわ。スペースキーを押してから、もう一度手を見せてほしいわ。");
	showError = true;
});
let eyes: Eyes;
let showQr: boolean = false;
let showError: boolean = false;
changeEyes("white");
let blink = setTimeout(closeEyes, Math.random() * 11000 + 4000);