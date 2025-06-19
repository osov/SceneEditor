# Как использовать конвертер

***Для тестовой аним сцены эти шаги уже проделаны!***
1. Сохранить сцену в src/defold/converter/tests/test_anim_scene.json
2. Cоздать проект в src/defold/converter/tests/test_anim_scene_project
3. Перенести все необходимые рессурсы в assets папку проекта, туда же добавить и metadata файл

Запустить команду `bun run convert`

# Описание прохода конвертации

### Основные функции

#### `parseScene(data: INodesList): DefoldData[]`
Создает основные файлы коллекций и GUI из структуры узлов.

#### `parseAtlas(data: IAtlas): DefoldData`
Создает файл атласа из списка изображений.

#### `parseFont(data: IFont): DefoldData`
Создает файл шрифта с указанными параметрами.

#### `parsePrefab(data: IPrefab): DefoldData`
Создает прототип игрового объекта.

## Полный процесс

1. Подготовка данных
2. Конвертация объектов редактора
3. Генерация основных файлов
4. Добавление атласов
5. Добавление шрифтов
6. Сохранение всех файлов

### 1. Подготовка данных

Создать структуру данных для конвертации:

```typescript
const main = {
    name: "/main/main",
    list: [] as NodeData[]
};
```

### 2. Конвертация объектов

Преобразовать объекты редактора в ноды конвертера:

```typescript
function convert(data: IBaseEntityData[], nodes: INodesList) {
    data.forEach((entity) => {
        const mesh = entity.other_data as any;
        
        switch (entity.type) {
            case IObjectTypes.GO_CONTAINER:
                nodes.list.push({
                    type: NodeType.GO,
                    data: {
                        id: entity.id,
                        pid: entity.pid,
                        name: entity.name,
                        position: new Vector3().fromArray(entity.position),
                        rotation: new Vector3().fromArray(entity.rotation),
                        scale: new Vector3().fromArray(entity.scale)
                    }
                });
                break;
                
            case IObjectTypes.GO_SPRITE_COMPONENT:
                const sprite_info = mesh?.material_uniforms?.u_texture;
                const sprite_atlas = sprite_info ? sprite_info.split('/')[0] : '';
                const sprite_texture = sprite_info ? sprite_info.split('/')[1] : '';
                
                nodes.list.push({
                    type: NodeType.SPRITE,
                    data: {
                        id: entity.id,
                        pid: entity.pid,
                        name: entity.name,
                        position: new Vector3().fromArray(entity.position),
                        rotation: new Vector3().fromArray(entity.rotation),
                        scale: new Vector3().fromArray(entity.scale),
                        width: mesh.size ? mesh.size[0] : 100,
                        height: mesh.size ? mesh.size[1] : 100,
                        color: mesh.color,
                        texture: sprite_texture,
                        atlas: `/assets/${sprite_atlas != '' ? sprite_atlas : 'default'}.atlas`,
                        slice_width: mesh.slice_width,
                        slice_height: mesh.slice_height
                    }
                });
                break;
                
            // Другие типы объектов...
        }
        
        if (entity.children) {
            convert(entity.children, nodes);
        }
    });
}
```

### 3. Генерация файлов Defold

Использовать `parseScene()` для создания основных файлов:

```typescript
const result: DefoldData[] = parseScene(main);
```

### 4. Добавление атласов

Собрать информацию об атласах и создайте файлы:

```typescript
const atlases: { [key: string]: string[] } = {};

// Сбор текстур из спрайтов и GUI блоков
main.list.forEach((node) => {
    if (![NodeType.SPRITE, NodeType.GUI_BOX].includes(node.type)) {
        return;
    }

    let atlas = (node.data as any).atlas;
    const texture = (node.data as any).texture;

    if (atlas == undefined || texture == undefined) {
        return;
    }

    atlas = atlas.replace('/assets/', '').replace('.atlas', '');

    if (atlases[atlas] == undefined) {
        atlases[atlas] = [];
    }

    if (!atlases[atlas].includes(texture)) {
        atlases[atlas].push(texture);
    }
});

// Создание файлов атласов
for (const [atlas, textures] of Object.entries(atlases)) {
    result.push(parseAtlas({
        name: `/assets/${atlas}`,
        images: textures.map((texture) => {
            // Получение пути к текстуре из метаданных
            const texture_path = `/assets/${texture_info.path}`;
            return `${texture_path}`;
        })
    }));
}
```

### 5. Добавление шрифтов

Создать файлы шрифтов:

```typescript
main.list.forEach((node) => {
    if (node.type != NodeType.LABEL) {
        return;
    }

    const font = (node.data as any).font.replace('.font', '.ttf');
    const size = (node.data as any).font_size;
    
    result.push(parseFont({
        font: font,
        size: size
    }));
});
```

### 6. Сохранение файлов

Сохраните все сгенерированные файлы:

```typescript
function generateFiles(data: DefoldData[], path_to_project: string) {
    for (const file of data) {
        switch (file.type) {
            case DefoldType.COLLECTION:
                const path_to_file = `${path_to_project}/${file.name}.collection`;
                fs.writeFile(path_to_file, file.data, (err) => {
                    if (err) console.error(err);
                    else console.log(`Created ${file.name}.collection`);
                });
                break;
                
            case DefoldType.GUI:
                fs.writeFile(`${path_to_project}/${file.name}.gui`, file.data, (err) => {
                    if (err) console.error(err);
                    else console.log(`Created ${file.name}.gui`);
                });
                break;
                
            case DefoldType.ATLAS:
                fs.writeFile(`${path_to_project}/${file.name}.atlas`, file.data, (err) => {
                    if (err) console.error(err);
                    else console.log(`Created ${file.name}.atlas`);
                });
                break;
                
            case DefoldType.FONT:
                fs.writeFile(`${path_to_project}/${file.name}.font`, file.data, (err) => {
                    if (err) console.error(err);
                    else console.log(`Created ${file.name}.font`);
                });
                break;
        }
    }
}
```