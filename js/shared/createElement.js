export function createElement(tagName, attributes = {}) {
    const $element = document.createElement(tagName);

    Object.entries(attributes).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (key === "className") {
            $element.className = value;
            return;
        }

        if (key === "textContent") {
            $element.textContent = value;
            return;
        }

        if (key === "dataset") {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                $element.dataset[dataKey] = dataValue;
            });
            return;
        }

        if (key === "children") {
            value.forEach($child => $element.appendChild($child));
            return;
        }

        if (key in $element) {
            $element[key] = value;
            return;
        }

        $element.setAttribute(key, value);
    });

    return $element;
}
