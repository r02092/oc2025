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
let eyes: string;
changeEyes("white");
let blink = setTimeout(closeEyes, Math.random() * 11000 + 4000);