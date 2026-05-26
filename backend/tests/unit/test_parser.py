from app.core.parser.python_parser import PythonParser

parser = PythonParser()

code = '''
import os


@app.route("/health")
def health_check():
    """API health endpoint"""
    logger.info("checking")
    return get_status()


@pytest.mark.unit
def test_payment():
    validate()
    process_payment()


class User:

    """User model"""

    @staticmethod
    def helper():
        print("helper")

    @classmethod
    def build(cls):
        return cls()

    def login(self):
        authenticate()
        self.track_login()

    def track_login(self):
        logger.info("tracking")


class Admin(User):

    @admin_required
    def delete_user(self, user_id):
        audit_log(user_id)
        remove_user(user_id)


def outer():

    def inner():
        nested_call()

    inner()
'''

units = parser.parse(code, "test.py")

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

    print("Decorators:", u.decorators)

    print("Calls:", u.calls)

    print("Source:")
    print(u.source)