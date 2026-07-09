# from app.core.parser.python_parser import PythonParser

# parser = PythonParser()

# code = '''
# import os


# @app.route("/health")
# def health_check():
#     """API health endpoint"""
#     logger.info("checking")
#     return get_status()


# @pytest.mark.unit
# def test_payment():
#     validate()
#     process_payment()


# class User:

#     """User model"""

#     @staticmethod
#     def helper():
#         print("helper")

#     @classmethod
#     def build(cls):
#         return cls()

#     def login(self):
#         authenticate()
#         self.track_login()

#     def track_login(self):
#         logger.info("tracking")


# class Admin(User):

#     @admin_required
#     def delete_user(self, user_id):
#         audit_log(user_id)
#         remove_user(user_id)


# def outer():

#     def inner():
#         nested_call()

#     inner()
# '''

# units = parser.parse(code, "test.py")

# for u in units:
#     print("\\n----------------------------")
#     print("ID:", u.id)
#     print("Name:", u.name)
#     print("Qualified:", u.qualified_name)
#     print("Type:", u.node_type)

#     print("Parent Class:", u.parent_class)

#     print("Start Line:", u.start_line)
#     print("End Line:", u.end_line)

#     print("Is Test:", u.is_test)

#     print("Docstring:", u.docstring)

#     print("Decorators:", u.decorators)

#     print("Calls:", u.calls)

#     print("Source:")
#     print(u.source)


from app.core.parser.python_parser import PythonParser

import sys
import importlib.util

print("=" * 80)
print("sys.path:")
for p in sys.path:
    print(p)

spec = importlib.util.find_spec("app")
print("\nfind_spec('app'):", spec)
if spec:
    print("origin:", spec.origin)
    print("submodule_search_locations:", spec.submodule_search_locations)
print("=" * 80)


def test_python_parser_extracts_functions():

    parser = PythonParser()

    code = """
    def foo():
        pass
    """

    units = parser.parse(code, "test.py")

    assert len(units) == 1
    assert units[0].name == "foo"


def test_parser_detects_test_function():

    parser = PythonParser()

    code = """
    def test_login():
        pass
    """

    units = parser.parse(code, "test.py")

    assert units[0].is_test is True