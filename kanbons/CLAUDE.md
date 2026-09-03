
Think before coding. State your assumptions out loud and make your considerations and tradeoffs clear. If the request is ambiguous, ask. If a simpler approach exists, push back. Stop when you are confused, name what is unclear, do not just pick one interpretationa and run with it, evaluate if it's the best decision. 

Simplicity first. Write the minimum code that solves the problem. Nno speculative abstractions. No flexibility nobody asked for. Use this test if unsure: would a senior engineer call this overcomplicated, if yes, then it's too complicated. 

Surgical changes. Touch only what the task requires. Do not improve neighboring code. Do not refactor what is broken. Every changed line should track back to the request. 

Goal-driven execution. Turn vague instructions into verifiable and testable targets before writing a line. "Add validation" becomes "write tests for invalid inputs, then make them pass" 

The UI should be functional but also dynamic. Currently the company uses an Excel sheet with Visual Basic functions that do a lot of the processing, so porting that over to an AI-native system should be as functional as it was before, without any of the clutter.

It should be scalable with new workflows and such that will be connected to this database soon afterwards. For example, taking in customer orders through an OCR ingestion workflow and adding that to the respective tables will be a feature, among others in the future which will be incorporated as per business needs.