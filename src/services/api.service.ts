import Axios from "axios";

const BASE_URL = "";

const axios = Axios.create({
  baseURL: BASE_URL,
});

axios.interceptors.response.use((response) => {
  if (response.status === 200 || response.status === 201) {
    return response.data;
  }
  return response;
});

type GenerateMockupsResponse = {
  total: number;
  results: {
    index: number;
    prompt: string;
    url: string;
  }[];
};
export const manualGenerateMockups = async (file: File, prompts: string[]) => {
  const formData = new FormData();

  formData.append("image", file);
  formData.append("prompts", JSON.stringify(prompts));

  return await axios.post<any, GenerateMockupsResponse>(
    "/api/mockups/generate-mockups",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

export const autoGeneratePrompts = async (file: File, count: string) => {
  const formData = new FormData();

  formData.append("image", file);
  formData.append("count", count);

  return await axios.post<any, string[]>(
    "/api/mockups/generate-prompts",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

export type ImageAnalysis = {
  productCategory: string;
  productType: string;
  displayMode: string;
  primaryColors: [];
  pattern: string;
  styleKeywords: [];
  mood: string;
  audience: string;
  inspiredBy: {
    source: string;
    theme: string;
    setting: string;
    styleReference: string;
  };
  characters: {
    hasCharacters: false;
    characterNames: string[];
    characterType: string[];
    numberOfCharacters: number;
    relationship: string;
    visualDescription: string;
  };
  material: {
    main: string;
    details: string;
    texture: string;
    weightOrThickness: string;
    flexibility: string;
    breathability: string;
    seasonSuitability: string[];
  };
};
export const analyzeProductFromImage = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  return await axios.post<any, ImageAnalysis>(
    "/api/ideas/analyze-product",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

export type GenerateIdeaReturn = {
  url: string;
  prompt: string;
};

export const generateProductIdeas = async (file: File, basePrompt: string) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("basePrompt", basePrompt);

  return axios.post<any, GenerateIdeaReturn[]>(
    "/api/ideas/generate-ideas",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

export const generateImagesFromReferalImages = async (params: {
  productImage: File;
  referenceImages?: File[];
  variations?: number;
}) => {
  const { productImage, referenceImages, variations } = params;

  const formData = new FormData();

  formData.append("productImage", productImage);

  if (referenceImages?.length) {
    for (const file of referenceImages) {
      formData.append("referenceImages", file);
    }
  }

  if (typeof variations === "number") {
    formData.append("variations", variations.toString());
  }

  return axios.post<any, string[]>("/ai/generate-from-references", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
