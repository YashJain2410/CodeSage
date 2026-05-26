from app.core.parser.javascript_parser import JavaScriptParser

parser = JavaScriptParser()

code = '''
/**
 * Health endpoint
 */
function healthCheck() {
    logger.info("checking")
    return getStatus()
}


class User {

    /**
     * Login user
     */
    login() {
        authenticate()
        this.trackLogin()
    }

    trackLogin() {
        logger.info("tracking")
    }
}


class Admin extends User {

    deleteUser(id) {
        auditLog(id)
        removeUser(id)
    }
}


function outer() {

    function inner() {
        nestedCall()
    }

    inner()
}
'''

units = parser.parse(code, "test.js")

for u in units:

    print("\\n----------------------------")

    print("ID:", u.id)
    print("Name:", u.name)
    print("Qualified:", u.qualified_name)
    print("Type:", u.node_type)

    print("Parent Class:", u.parent_class)

    print("Start Line:", u.start_line)
    print("End Line:", u.end_line)

    print("Is Test:", u.is_test)

    print("Docstring:", u.docstring)

    print("Calls:", u.calls)

    print("Source:")
    print(u.source)