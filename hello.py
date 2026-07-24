"""동작 확인용 테스트 스크립트.

Wrks Coding Agent 연동이 정상적으로 되는지 확인하기 위한 간단한 예제입니다.
"""

from datetime import datetime


def greet(name: str = "Hamsoa") -> str:
    """인사 메시지를 만들어 반환한다."""
    return f"안녕하세요, {name}! Wrks Coding Agent 연동 테스트입니다."


def main() -> None:
    print(greet())
    print(f"현재 시각: {datetime.now():%Y-%m-%d %H:%M:%S}")


if __name__ == "__main__":
    main()
