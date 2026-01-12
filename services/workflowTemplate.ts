export const WORKFLOW_TEMPLATE = {
  // Checkpoint Loader
  "4": {
    "inputs": {
      "ckpt_name": "juggernautXL_v9Rundiffusionphoto2.safetensors" // User needs to ensure this exists or we make it selectable
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  // Positive Prompt
  "6": {
    "inputs": {
      "text": "", // Will be replaced efficiently
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Positive Prompt"
    }
  },
  // Negative Prompt
  "7": {
    "inputs": {
      "text": "text, watermark, low quality, blurred, deformation, lowres",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Negative Prompt"
    }
  },
  // Empty Latent Image (Base resolution)
  "5": {
    "inputs": {
      "width": 1280,
      "height": 720,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  // Load Base Image (for ControlNet)
  "10": {
    "inputs": {
      "image": "example.png", // Dynamic
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Base Image"
    }
  },
  // ControlNet Loader
  "11": {
    "inputs": {
      "control_net_name": "Union_sdxl_promaxl.safetensors"
    },
    "class_type": "ControlNetLoader",
    "_meta": {
      "title": "Load ControlNet"
    }
  },
  // ControlNet Apply
  "12": {
    "inputs": {
      "strength": 0.8, // Dynamic: fidelity
      "start_percent": 0.0,
      "end_percent": 1.0,
      "positive": ["6", 0],
      "negative": ["7", 0],
      "control_net": ["11", 0],
      "image": ["10", 0]
    },
    "class_type": "ControlNetApplyAdvanced",
    "_meta": {
      "title": "Apply ControlNet"
    }
  },
  // KSampler
  "3": {
    "inputs": {
      "seed": 0, // Dynamic
      "steps": 25,
      "cfg": 7,
      "sampler_name": "dpmpp_2m",
      "scheduler": "karras",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["12", 0], // output of ControlNet 
      "negative": ["12", 1], // output of ControlNet
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  // VAE Decode
  "8": {
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  // Save Image (WebSocket output)
  "9": {
    "inputs": {
      "filename_prefix": "Infravision",
      "images": ["8", 0]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  }
};
