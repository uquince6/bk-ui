import { makeFullScreenQuad, makePipeline } from "./utils.js";

import makeRain from "./rainPass.js";
import makeBloomPass from "./bloomPass.js";
import makePalettePass from "./palettePass.js";
import makeStripePass from "./stripePass.js";
import makeImagePass from "./imagePass.js";
import makeQuiltPass from "./quiltPass.js";
import makeMirrorPass from "./mirrorPass.js";
import { setupCamera, cameraCanvas, cameraAspectRatio } from "../camera.js";
import getLKG from "./lkgHelper.js";

const effects = {
	none: null,
	plain: makePalettePass,
	palette: makePalettePass,
	customStripes: makeStripePass,
	stripes: makeStripePass,
	pride: makeStripePass,
	transPride: makeStripePass,
	trans: makeStripePass,
	image: makeImagePass,
	mirror: makeMirrorPass,
};

// [bk-ui patch] `dimensions` era un singleton de módulo: al re-montar quedaba
// con el tamaño del montaje anterior, el frame loop no detectaba cambio y nunca
// llamaba setSize() sobre el pipeline nuevo -> lienzo en blanco. Ahora es local.

// [bk-ui patch] base real del motor vendorizado (ver PATCHES.md)
const ENGINE_BASE = new URL("../../", import.meta.url).href;

const loadJS = (src) =>
	new Promise((resolve, reject) => {
		const existing = document.querySelector(`script[data-matrix-engine="${src}"]`);
		if (existing) {
			resolve();
			return;
		}
		const tag = document.createElement("script");
		tag.onload = resolve;
		tag.onerror = reject;
		tag.src = new URL(src, ENGINE_BASE).href; // [bk-ui patch]
		tag.dataset.matrixEngine = src;
		document.body.appendChild(tag);
	});

// [bk-ui patch] `hooks` nuevo: la app anfitriona puede abortar un montaje en
// curso y obtener el teardown apenas existe el contexto WebGL, aunque la carga
// de assets todavía no haya terminado (evita fugas de contexto al alternar
// efectos rápido). Ver PATCHES.md.
export default async (canvas, config, hooks = {}) => {
	const dimensions = { width: 0, height: 0 };
	const isAborted = () => Boolean(hooks.aborted?.());

	await Promise.all([loadJS("lib/regl.min.js"), loadJS("lib/gl-matrix.js")]);
	if (isAborted()) return { destroy() {} };

	const resize = () => {
		const devicePixelRatio = window.devicePixelRatio ?? 1;
		canvas.width = Math.ceil(canvas.clientWidth * devicePixelRatio * config.resolution);
		canvas.height = Math.ceil(canvas.clientHeight * devicePixelRatio * config.resolution);
	};
	// [bk-ui patch] era window.onresize = resize (pisaba handlers de la app
	// anfitriona); el doble-clic a pantalla completa se quita para uso embebido.
	window.addEventListener("resize", resize, { passive: true });
	resize();

	if (config.useCamera) {
		await setupCamera();
	}

	const extensions = ["OES_texture_half_float", "OES_texture_half_float_linear"];
	// These extensions are also needed, but Safari misreports that they are missing
	const optionalExtensions = ["EXT_color_buffer_half_float", "WEBGL_color_buffer_float", "OES_standard_derivatives"];

	switch (config.testFix) {
		case "fwidth_10_1_2022_A":
			extensions.push("OES_standard_derivatives");
			break;
		case "fwidth_10_1_2022_B":
			optionalExtensions.forEach((ext) => extensions.push(ext));
			extensions.length = 0;
			break;
	}

	const regl = createREGL({ canvas, pixelRatio: 1, extensions, optionalExtensions });

	// [bk-ui patch] teardown idempotente, disponible ya mismo para la app anfitriona
	let tick = null;
	let torn = false;
	const teardown = () => {
		if (torn) return;
		torn = true;
		try { tick?.cancel?.(); } catch {}
		window.removeEventListener("resize", resize);
		try { regl.destroy(); } catch {}
		try {
			canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
			canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
		} catch {}
	};
	hooks.onTeardown?.(teardown);
	if (isAborted()) { teardown(); return { destroy: teardown }; }

	const cameraTex = regl.texture(cameraCanvas);
	const lkg = await getLKG(config.useHoloplay, true);

	// All this takes place in a full screen quad.
	const fullScreenQuad = makeFullScreenQuad(regl);
	const effectName = config.effect in effects ? config.effect : "palette";
	const context = { regl, config, lkg, cameraTex, cameraAspectRatio };
	const pipeline = makePipeline(context, [makeRain, makeBloomPass, effects[effectName], makeQuiltPass]);
	const screenUniforms = { tex: pipeline[pipeline.length - 1].outputs.primary };
	const drawToScreen = regl({ uniforms: screenUniforms });
	try {
		await Promise.all(pipeline.map((step) => step.ready));
	} catch (err) {
		// [bk-ui patch] si un asset falla, no dejar el contexto colgado
		teardown();
		throw err;
	}
	if (isAborted()) { teardown(); return { destroy: teardown }; }

	const targetFrameTimeMilliseconds = 1000 / config.fps;
	let last = NaN;

	tick = regl.frame(({ viewportWidth, viewportHeight }) => { // [bk-ui patch] tick declarado arriba
		if (config.once) {
			tick.cancel();
		}

		const now = regl.now() * 1000;

		if (isNaN(last)) {
			last = now;
		}

		const shouldRender = config.fps >= 60 || now - last >= targetFrameTimeMilliseconds || config.once == true;

		if (shouldRender) {
			while (now - targetFrameTimeMilliseconds > last) {
				last += targetFrameTimeMilliseconds;
			}
		}

		if (config.useCamera) {
			cameraTex(cameraCanvas);
		}
		if (dimensions.width !== viewportWidth || dimensions.height !== viewportHeight) {
			dimensions.width = viewportWidth;
			dimensions.height = viewportHeight;
			for (const step of pipeline) {
				step.setSize(viewportWidth, viewportHeight);
			}
		}
		fullScreenQuad(() => {
			for (const step of pipeline) {
				step.execute(shouldRender);
			}
			drawToScreen();
		});
	});

	// [bk-ui patch] handle para poder desmontar el efecto de forma limpia
	return { destroy: teardown };
};
