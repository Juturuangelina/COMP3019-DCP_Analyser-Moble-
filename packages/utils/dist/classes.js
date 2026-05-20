export function cx(...classes) {
    return classes
        .flatMap((arg) => {
        if (!arg)
            return [];
        if (typeof arg === "string")
            return [arg];
        return Object.entries(arg)
            .filter(([, val]) => Boolean(val))
            .map(([key]) => key);
    })
        .join(" ");
}
export default cx;
