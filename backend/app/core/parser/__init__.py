from app.core.parser.python_parser import PythonParser
from app.core.parser.javascript_parser import JavaScriptParser

def get_parser(filepath: str):

    if filepath.endswith(".py"):
        return PythonParser()
    
    elif filepath.endswith(".js"):
        return JavaScriptParser()
    
    elif filepath.endswith(".ts"):
        return JavaScriptParser()
    
    elif filepath.endswith(".tsx"):
        return JavaScriptParser()
    
    return None