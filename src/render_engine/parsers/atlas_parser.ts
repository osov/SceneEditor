
// Интерфейс для структуры данных
interface TextureData {
    position: { x: number; y: number };
    size: { width: number; height: number };
}

// Функция парсинга файла unity.tpsheet
export function parse_unity_tp_sheet(fileContent: string): Record<string, TextureData> {
    const lines = fileContent.split("\n");

    const textureMap: Record<string, TextureData> = {};

    for (const line of lines) {
        if (line.startsWith("#") || line.startsWith(":") || line.trim() === "") {
            // Игнорируем комментарии и метаданные
            continue;
        }

        const parts = line.split(";").map((part) => part.trim());

        if (parts.length < 5) {
            continue; // Пропускаем строки, не содержащие достаточно данных
        }

        const name = parts[0]; // Имя текстуры
        const x = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        const width = parseInt(parts[3], 10);
        const height = parseInt(parts[4], 10);

        if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
            textureMap[name] = {
                position: { x, y },
                size: { width, height },
            };
        }
    }
    return textureMap;
}


// Функция преобразования позиции и размера текстуры в UV-координаты
export function convert_to_uv_coordinates(textureMap: Record<string, TextureData>, atlasWidth: number, atlasHeight: number): Record<string, { uvOffset: [number, number]; uvScale: [number, number] }> {
    const uvData: Record<string, { uvOffset: [number, number]; uvScale: [number, number] }> = {};

    Object.entries(textureMap).forEach(([name, data]) => {
        const { x, y } = data.position;
        const { width, height } = data.size;

        // UV Offset (верхний левый угол)
        const uvOffsetX = x / atlasWidth;
        const uvOffsetY =  y / atlasHeight; 

        // UV Scale (размер в UV-системе)
        const uvScaleX = width / atlasWidth;
        const uvScaleY = height / atlasHeight;

        uvData[name] = {
            uvOffset: [uvOffsetX, uvOffsetY],
            uvScale: [uvScaleX, uvScaleY],
        };
    });

    return uvData;
}


export function parse_tp_data_to_uv(tpData: string, atlasWidth: number, atlasHeight: number): Record<string, { uvOffset: [number, number]; uvScale: [number, number] }> {
    const textureMap = parse_unity_tp_sheet(tpData);
    return convert_to_uv_coordinates(textureMap, atlasWidth, atlasHeight);
}