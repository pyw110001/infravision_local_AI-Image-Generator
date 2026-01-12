
import { WORKFLOW_TEMPLATE } from './workflowTemplate';
import { GenerationParams, ImageAsset } from "../types";

const COMFY_API_URL = "http://127.0.0.1:8188";

// 1. Upload Image to ComfyUI (Input Directory)
const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("overwrite", "true");

    const response = await fetch(`${COMFY_API_URL}/upload/image`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    const data = await response.json();
    // Returns { name: "filename.png", subfolder: "", type: "input" }
    return data.name;
};

// 2. Queue Prompt
// modify prompt based on parameters and uploaded images
export const generateImage = async (
    prompt: string,
    baseImage: ImageAsset,
    styleImages: ImageAsset[],
    params: GenerationParams,
    maskData?: string
): Promise<string> => {

    // Check connection first
    try {
        await fetch(`${COMFY_API_URL}/system_stats`);
    } catch (e) {
        throw new Error("无法连接到本地 ComfyUI 服务 (127.0.0.1:8188)。请确保服务已启动并允许跨域。");
    }

    // 1. Upload Base Image
    let baseImageName = "";
    if (baseImage.file) {
        baseImageName = await uploadImage(baseImage.file);
    } else if (baseImage.url.startsWith("data:")) {
        // Convert base64 to File object
        const res = await fetch(baseImage.url);
        const blob = await res.blob();
        const file = new File([blob], `base_${Date.now()}.png`, { type: "image/png" });
        baseImageName = await uploadImage(file);
    }

    // 2. Prepare Workflow
    // Deep copy template
    const workflow: any = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));

    // -- Map Parameters -- 

    // Checkpoint (User might need to configure this, for now we hardcode or check existence later)
    // workflow["4"].inputs.ckpt_name = "RealVisXL_V3.0.safetensors"; 

    // Prompt
    workflow["6"].inputs.text = prompt + ", highly detailed, 8k, photorealistic";

    // Dimensions (Based on aspectRatio)
    let width = 1280;
    let height = 720;
    if (params.aspectRatio === '4:3') { width = 1152; height = 896; }
    if (params.aspectRatio === '1:1') { width = 1024; height = 1024; }

    workflow["5"].inputs.width = width;
    workflow["5"].inputs.height = height;

    // Seed
    if (!params.lockedSeed) {
        workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000);
    } else {
        workflow["3"].inputs.seed = params.seed;
    }

    // ControlNet (Base Image)
    if (baseImageName) {
        workflow["10"].inputs.image = baseImageName;
        workflow["12"].inputs.strength = params.fidelity; // Map Fidelity -> ControlNet Strength

        // Link ControlNet Flow
        // If Fidelity is 0, we could bypass ControlNet, but here we keep it simple
    }

    // Style Images (Todo: Implement IPAdapter Logic in Template)
    // For now, we mix style keywords into prompt if no IPAdapter nodes
    // workflow["6"].inputs.text += " style of " + ...

    // 3. Connect WebSocket for Status
    const clientId = "client_" + Date.now();
    const socket = new WebSocket(`ws://127.0.0.1:8188/ws?clientId=${clientId}`);

    return new Promise((resolve, reject) => {
        socket.onopen = async () => {
            // 4. Send Queue Request
            try {
                const queueRes = await fetch(`${COMFY_API_URL}/prompt`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        client_id: clientId,
                        prompt: workflow
                    })
                });

                if (!queueRes.ok) {
                    throw new Error("Failed to queue prompt");
                }
            } catch (err) {
                socket.close();
                reject(err);
            }
        };

        socket.onmessage = async (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === 'execution_start') {
                console.log("Execution started:", msg.data);
            }

            if (msg.type === 'executed') {
                // Completed!
                const images = msg.data.output.images;
                if (images && images.length > 0) {
                    const filename = images[0].filename;
                    const subfolder = images[0].subfolder;
                    const type = images[0].type;

                    // Fetch Result Image
                    const imageUrl = `${COMFY_API_URL}/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;

                    // Convert to Base64 to keep consistent with app logic (optional, but good for local/remote abstraction)
                    // Or return URL directly if we allow local resource access

                    // For now, let's fetch blob and create object URL to avoid browser blocking local resource
                    const imgRes = await fetch(imageUrl);
                    const blob = await imgRes.blob();
                    const objectUrl = URL.createObjectURL(blob); // Temporary URL

                    // Better: Convert to dataURL to store in project state persistently
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        socket.close();
                        resolve(reader.result as string);
                    }
                }
            }
        };

        socket.onerror = (err) => {
            console.error("Socket error", err);
            reject(new Error("WebSocket Connection Error"));
        };
    });
};
