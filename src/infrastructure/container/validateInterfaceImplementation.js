function validateInterfaceImplementation(instance, InterfaceClass, instanceName) {
    if (!(instance instanceof InterfaceClass)) {
        throw new Error(`[DI] ${instanceName} no extiende ${InterfaceClass.name}`);
    }

    const methodNames = Object.getOwnPropertyNames(InterfaceClass.prototype)
        .filter((name) => name !== 'constructor');

    for (const methodName of methodNames) {
        if (typeof instance[methodName] !== 'function') {
            throw new Error(`[DI] ${instanceName} no implementa el método ${methodName} de ${InterfaceClass.name}`);
        }

        if (instance[methodName] === InterfaceClass.prototype[methodName]) {
            throw new Error(`[DI] ${instanceName} no sobreescribe ${methodName} de ${InterfaceClass.name}`);
        }
    }
}

module.exports = {
    validateInterfaceImplementation
};
