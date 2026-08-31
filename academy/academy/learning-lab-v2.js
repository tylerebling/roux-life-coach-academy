(() => {
  const lessonMatch = location.pathname.match(/lesson-(\d{2})/i);
  if (!lessonMatch || typeof quiz === 'undefined') return;
  const lesson = Number(lessonMatch[1]);
  const titleCase = text => text.replace(/\b\w[^\s]*/g, word => /^(a|an|and|as|at|but|by|for|from|in|into|nor|of|on|or|the|to|with)$/i.test(word) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1));
  const clean = text => text
    .replaceAll('ROUX LIFE ACADEMY', 'Roux Life Academy').replaceAll('ROUX', 'Roux').replaceAll('Â·', '·').replaceAll('â€”', '—')
    .replaceAll('â€™', '’').replaceAll('â€œ', '“').replaceAll('â€', '”')
    .replaceAll('rÃ©sumÃ©', 'résumé').replaceAll('âœ“', '✓');
  document.body.classList.add('learning-lab-v2');
  document.querySelectorAll('h1,h2,.eyebrow,nav a,.card strong,.download').forEach(node => {
    node.childNodes.forEach(child => { if (child.nodeType === Node.TEXT_NODE) child.textContent = clean(child.textContent); });
  });
  document.querySelectorAll('h2,.card strong').forEach(node => { node.textContent = titleCase(node.textContent.trim()); });
  document.querySelectorAll('*').forEach(node => {
    if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) node.firstChild.textContent = clean(node.firstChild.textContent);
  });

  const main = document.querySelector('main');
  const quizSection = document.getElementById('quiz');
  const nav = document.querySelector('body>nav');
  if (!main || !quizSection || !nav) return;
  const review = document.createElement('section');
  review.id = 'review';
  review.innerHTML = `<div class="eyebrow">Lesson ${lesson} Review</div><h2>Bring the Lesson Into Focus</h2><p>Six concise review cards connect the lesson’s essential ideas to the judgment required on the assessment.</p><div class="rl-review-shell"><div class="rl-review-meta">Essential Coaching Judgment</div><div id="rlReviewCard"></div><div class="rl-review-controls"><button id="rlReviewBack" type="button" aria-label="Previous review card">←</button><span id="rlReviewCount"></span><button id="rlReviewNext" type="button" aria-label="Next review card">→</button><button id="rlBeginQuiz" type="button" class="rl-hidden">Begin the Assessment</button></div></div>`;
  main.insertBefore(review, quizSection);

  const oldLinks = [...nav.querySelectorAll('a')];
  const names = {case:['Welcome','Lesson Orientation'],workbook:['Workbook','Guided Application'],practice:['Practice','Practical Integration'],quiz:['Final Quiz','12 Questions · 80%'],downloads:['Completion','Results and Downloads']};
  nav.innerHTML = '';
  oldLinks.forEach(link => {
    const id = (link.getAttribute('href') || '').replace('#','');
    if (!document.getElementById(id)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.panel = id;
    const copy = names[id] || [titleCase(link.textContent.trim()),''];
    button.innerHTML = `${copy[0]}<small>${copy[1]}</small>`;
    nav.appendChild(button);
    if (id === 'practice') {
      const reviewButton = document.createElement('button');
      reviewButton.type = 'button'; reviewButton.dataset.panel = 'review';
      reviewButton.innerHTML = 'Lesson Review<small>Six Essential Takeaways</small>';
      nav.appendChild(reviewButton);
    }
  });

  const sections = [...main.querySelectorAll(':scope>section')];
  const buttons = [...nav.querySelectorAll('[data-panel]')];
  const reviewKey = `rouxLesson${lesson}ReviewComplete`;
  const quizButton = nav.querySelector('[data-panel="quiz"]');
  const show = id => {
    if (id === 'quiz' && localStorage.getItem(reviewKey) !== 'true') id = 'review';
    sections.forEach(section => section.classList.toggle('active', section.id === id));
    buttons.forEach(button => button.classList.toggle('active', button.dataset.panel === id));
    scrollTo({top:0,behavior:'smooth'});
    window.dispatchEvent(new CustomEvent('roux-lab-section-change',{detail:{id}}));
  };
  buttons.forEach(button => button.onclick = () => {
    if (button.disabled) return;
    show(button.dataset.panel);
  });
  sections.forEach(section => section.classList.remove('active'));
  show(sections[0]?.id || 'case');

  const REVIEW_LIBRARY = {
    3:[
      ['Facts and Stories','An event is what happened. A story is the meaning we attach to it. Both matter, but they are not the same.','A manager did not reply to two emails. “I am not respected” is one possible story—not a proven fact.','What happened that a neutral observer could confirm?'],
      ['Feelings Are Information','Feelings can point to needs, values, or fears. They do not automatically prove that the story behind them is true.','Feeling rejected is real even when the reason for the silence is still unknown.','What is this feeling asking you to notice?'],
      ['Protection Has a Purpose','Avoiding, pleasing, perfectionism, or shutting down often began as attempts to create safety or belonging.','Overpreparing may protect someone from criticism while also keeping their ideas hidden.','What does this response help you avoid or preserve?'],
      ['Cost and Choice','A protective response can help in the short term and still create a long-term cost. Naming both sides reduces shame and restores choice.','Staying silent prevents immediate embarrassment but can weaken confidence and visibility over time.','What does this pattern give you—and what does it cost you?'],
      ['A More Complete Story','A useful reframe does not force positivity. It keeps the facts, honors the feeling, and adds missing possibilities and personal agency.','“I was not heard in that meeting, and I can ask for feedback or bring the idea forward again.”','What else could be true without dismissing your experience?'],
      ['Small Evidence Experiments','New beliefs become believable through lived evidence, not slogans. Choose a small, responsible action that gathers information.','Share one early idea with a trusted colleague and notice what actually happens.','What small step could help you learn rather than prove?']
    ],
    4:[
      ['Values Are Chosen Directions','Values describe how a person wants to live, not what they must achieve to be worthy.','“Honesty” can guide a difficult conversation even when the outcome is uncertain.','How do you want to show up here?'],
      ['Goals and Values Are Different','A goal can be completed. A value continues to guide choices before, during, and after the goal.','Getting promoted is a goal; leading with fairness is a value.','What quality should guide the way you pursue this?'],
      ['Identity Is Larger Than a Role','Jobs, relationships, performance, and other roles matter, but none of them contains a person’s entire identity.','Losing a position changes a role; it does not erase character, experience, or possibility.','Who are you beyond this role or result?'],
      ['Inherited Rules Need Review','People often live by family, cultural, or workplace rules they never consciously chose. Coaching helps examine whether those rules still fit.','“Good people never disappoint anyone” can create chronic self-abandonment.','Whose rule is this, and do you still choose it?'],
      ['Values Conflict','Two worthy values can pull in different directions. The work is not to find a perfect answer but to choose responsibly.','Loyalty may support staying while self-respect supports leaving.','Which value needs your attention in this season?'],
      ['Truth Becomes Action','A value matters when it changes a real choice. Translate abstract words into visible behavior.','If courage matters, one action may be asking the question you have avoided.','What would this value look like in the next seven days?']
    ],
    5:[
      ['Vulnerability Is Honest Exposure','Vulnerability means allowing something real to be seen when the outcome cannot be controlled. It is not oversharing.','Asking for help may reveal uncertainty while still protecting private details.','What truth wants a safe and appropriate voice?'],
      ['Armor Tries to Protect','Perfectionism, humor, control, detachment, and people-pleasing can function like emotional armor.','Joking through every serious moment may prevent rejection and also block closeness.','What is this strategy trying to protect?'],
      ['Safety Comes Before Disclosure','Clients choose what to share, when, and with whom. A coach invites; a coach does not pressure.','A client can explore the edge of a topic without telling the full story.','What would feel honest and appropriately safe?'],
      ['Courage Is Contextual','The bravest action is not always the biggest or most public action. Courage should match capacity, values, and risk.','Naming one need privately may be more responsible than making a dramatic announcement.','What is the smallest honest step?'],
      ['Boundaries Support Openness','Healthy boundaries make vulnerability safer because the person decides the audience, timing, purpose, and amount.','“I want to talk about the impact, but I am not ready to share every detail.”','What belongs in this conversation—and what does not?'],
      ['Coach Without Making It About You','A coach may acknowledge a moment briefly, but personal disclosure should serve the client rather than seek comfort or connection for the coach.','“I notice I may be assuming; let me slow down” is boundaried professional honesty.','Would sharing this help the client or relieve me?']
    ],
    6:[
      ['Courage Is Action With Fear Present','Courage does not require confidence first. It is a values-based choice made while discomfort is still present.','A client can ask for feedback while still feeling nervous.','What matters enough to carry this discomfort?'],
      ['Make the Step Specific','Vague intentions are hard to act on. Define the behavior, timing, setting, and first move.','Replace “speak up more” with “share one idea in Thursday’s meeting.”','What exactly will you do, and when?'],
      ['Use a Courage Ladder','Break a feared action into manageable levels instead of demanding the hardest version immediately.','Rehearse, tell one trusted person, then have the direct conversation.','What is one level challenging but still workable?'],
      ['Prepare for the Body’s Response','Fear can bring tension, racing thoughts, or an urge to escape. Planning support helps the client stay present.','Pause, breathe, use notes, and ask for a moment before responding.','What will help you remain grounded?'],
      ['Success Includes Learning','An action can be successful even when the outcome is imperfect if it produces honest information and practice.','A request may be declined, yet the client still practiced clear self-advocacy.','What would make this worthwhile regardless of the answer?'],
      ['Review Without Shame','After action, examine what happened, what helped, and what needs adjustment. Do not turn one result into an identity verdict.','“The timing was poor” is useful information; “I am terrible at this” is not.','What did this attempt teach you?']
    ],
    7:[
      ['Shame and Guilt Are Different','Guilt says a behavior may need repair. Shame says the whole person is defective. Coaching separates identity from action.','“I broke an agreement” can lead to repair; “I am a bad person” often leads to hiding.','What did you do, and what does that not define about you?'],
      ['The Inner Critic Has a Job','Harsh self-talk often tries to prevent rejection, failure, or loss of control, even when its method causes harm.','“Do not try unless it is perfect” may be attempting to prevent embarrassment.','What is the critic afraid would happen without it?'],
      ['Name the Voice, Do Not Obey It','Creating distance from critical thoughts makes room for choice. A thought can be noticed without becoming a command.','“I am noticing the thought that I will fail” is different from “I will fail.”','What does the critic say, and what do you choose?'],
      ['Accountability Without Attack','Responsibility becomes stronger when the person can face impact without being crushed by self-condemnation.','A sincere apology names the action, impact, repair, and changed behavior.','What repair is yours to make?'],
      ['Use Accurate, Humane Language','Self-compassion is not pretending nothing happened. It combines truth with the tone needed for learning.','“I handled that poorly, and I can practice a better response.”','What would be both honest and useful?'],
      ['Know When Shame Needs Clinical Care','Persistent trauma symptoms, severe impairment, self-harm, or overwhelming shame may require licensed mental-health support.','A coach can support values and action while referring clinical treatment needs.','Is this coaching work, or does safety require another professional?']
    ],
    8:[
      ['Self-Compassion Has Three Parts','Notice the pain, remember that struggle is human, and respond with useful kindness rather than attack.','“This hurts. I am not alone in making mistakes. What support would help me repair?”','What response would help you learn and move?'],
      ['Compassion Is Not Excusing','Kindness and responsibility can coexist. Compassion lowers defensiveness so a person can face impact more honestly.','A client can acknowledge harm without using shame as punishment.','What needs care, and what needs repair?'],
      ['Repair Is Behavioral','Repair requires more than feeling sorry. It includes ownership, listening, amends when appropriate, and changed action.','“I interrupted you repeatedly. I understand the impact. Next time I will pause and check in.”','What would the other person experience as repair?'],
      ['Resilience Is Returning','Resilience is not never struggling. It is the capacity to recover, adapt, reconnect, and keep choosing.','Taking a pause after a setback can support a stronger return.','What helps you come back to yourself?'],
      ['Support Builds Capacity','Sustainable resilience includes relationships, rest, skills, and resources—not only individual toughness.','Asking for help can be a resilient choice rather than evidence of weakness.','What support belongs in this plan?'],
      ['Turn Setbacks Into Information','A setback is data about conditions, needs, expectations, or skills. Review it without turning it into a verdict.','Missing a habit during an overloaded week may show the plan needs a smaller version.','What did the setback reveal?']
    ],
    9:[
      ['Attachment Patterns Are Strategies','Attachment language describes learned ways of seeking safety and connection; it is not a fixed identity or diagnosis.','A person may pursue reassurance in one relationship and withdraw in another.','What do you do when connection feels uncertain?'],
      ['The Nervous System Reads Cues','Tone, delay, closeness, conflict, and inconsistency can be interpreted as signals of safety or threat.','A delayed text can activate fear even when no rejection has occurred.','What cue did your system respond to?'],
      ['Separate Cue From Conclusion','A reaction may be understandable while the meaning assigned to the cue remains unconfirmed.','“They paused” is a cue; “they are leaving me” is a conclusion.','What do you know, and what are you predicting?'],
      ['Regulate Before Choosing','When activation is high, slow the pace before making demands, withdrawing, or ending a relationship.','Take ten minutes, orient to the room, then decide what communication is needed.','What would help you respond rather than react?'],
      ['Ask Directly and Boundaried','Secure behavior includes clear requests, respect for another person’s answer, and responsibility for one’s own limits.','“Could you tell me when you expect to reply?” is clearer than testing or hinting.','What do you need to ask plainly?'],
      ['Do Not Diagnose Relationships','Coaches can explore patterns and choices but should not label partners or treat attachment trauma outside scope.','Use pattern language and refer when trauma treatment or safety planning is needed.','What can be explored safely within coaching?']
    ],
    10:[
      ['Connection Starts With Presence','People feel connected when they experience attention, curiosity, and accurate understanding—not when the coach performs expertise.','Reflect the client’s meaning before offering a new perspective.','What do you most want me to understand?'],
      ['Listen for More Than Words','Notice content, emotion, values, pace, energy, and what changes during the conversation without claiming to know the cause.','“Your pace slowed when you mentioned home—what are you noticing?”','What changed, and may I ask about it?'],
      ['Reflect Before You Interpret','A reflection checks understanding; an interpretation introduces a theory. Interpretations require permission and humility.','“You sound disappointed” invites correction; “You fear abandonment” asserts a cause.','Am I reflecting what I heard or adding my own story?'],
      ['Clear Requests Reduce Guessing','Healthy communication names the situation, impact, need, and request without blame or mind-reading.','“When plans change late, I feel unsettled. Could you text me as soon as you know?”','What specific request would make this clearer?'],
      ['Boundaries Are Communication','A boundary explains what the speaker will do to protect a need or limit. It does not control another person.','“If yelling begins, I will pause the conversation and return later.”','What action is yours to take?'],
      ['Repair Misattunement','Misunderstanding is normal. Strong connection grows when people notice, acknowledge, and repair it.','“I moved too quickly and missed what mattered. Can we go back?”','What did I miss, and how can we reconnect?']
    ],
    11:[
      ['A Boundary Defines Your Participation','A boundary states what you will do, allow, decline, or leave. It is not a demand that another person change.','“I will end the call if insults continue” is a boundary; “You may never get angry” is control.','What action belongs to you?'],
      ['Needs Do Not Require a Court Case','A person can set a limit because it supports safety, capacity, or values without proving the other person is wrong.','You can decline extra work because your capacity is full.','What limit would honor your real capacity?'],
      ['Guilt Can Accompany Healthy Choice','Feeling guilty does not automatically mean the boundary is unkind. Guilt may reflect an old rule about pleasing or availability.','A respectful “no” may still feel uncomfortable when someone expects access.','Is this guilt evidence of harm or evidence of change?'],
      ['Say It Clearly and Briefly','Strong boundaries use direct language, little overexplaining, and a consequence the speaker can realistically carry out.','“I am unavailable tonight. I can talk tomorrow after six.”','Can you say it without defending your worth?'],
      ['Expect Information, Not Permission','Another person’s reaction offers information about the relationship. Their disappointment does not erase the limit.','A client can acknowledge frustration without reversing the boundary.','How will you stay grounded if they dislike the answer?'],
      ['Safety Changes the Plan','Coercion, stalking, threats, or violence require safety planning and specialized support—not routine communication coaching.','Do not encourage a direct confrontation when it could increase danger.','What support is needed to protect safety first?']
    ],
    12:[
      ['Conflict Is Not Automatically Harm','Conflict is a difference that needs attention. Harm involves coercion, degradation, threat, or violence and requires a different response.','Two people can disagree respectfully; intimidation is not healthy conflict.','Is this a disagreement, a pattern of harm, or an immediate safety concern?'],
      ['Regulate the Pace','Productive conflict requires enough steadiness to listen and choose words. Pausing can protect the conversation when it includes a clear return.','“I need twenty minutes. I will come back at seven.”','What pause would support a genuine return?'],
      ['Describe, Do Not Prosecute','Use observable behavior and specific impact instead of global labels, mind-reading, or a list of every past offense.','“The deadline changed twice without notice” is clearer than “You never respect me.”','What could a neutral observer confirm?'],
      ['Make a Real Request','A request is specific, possible, and open to an answer. A demand punishes or pressures the person for saying no.','“Could we confirm changes by email?” gives the listener something clear to answer.','What exactly are you asking for?'],
      ['Listen for the Need Under the Position','Positions are proposed solutions; needs explain why they matter. Shared needs can open more options.','“I need it my way” may contain needs for reliability or autonomy.','What matters underneath your preferred solution?'],
      ['Know When to Stop Coaching the Conversation','Threats, stalking, coercion, violence, or severe escalation call for safety resources and qualified help.','Routine communication tools are not a substitute for domestic-violence or crisis support.','What would protect the client rather than pressure engagement?']
    ],
    13:[
      ['Change Includes Loss','Even wanted change can involve grief for roles, routines, certainty, identity, or imagined futures.','A promotion can bring pride and grief for a former team.','What are you gaining, and what are you leaving?'],
      ['Grief Has No Fixed Schedule','People move through grief in uneven waves. Coaching should not force closure, meaning, or productivity.','A hard day after several easier days is not failure or regression.','What does this moment need rather than what should it look like?'],
      ['Uncertainty Activates Prediction','The mind often fills unknown space with worst-case or overconfident stories. Name what is known, unknown, and controllable.','“I have not received a decision” differs from “I will be rejected.”','What do you know today?'],
      ['Create Anchors, Not False Certainty','When outcomes cannot be controlled, routines, relationships, values, and next actions can provide steadiness.','Keep one morning practice and one weekly support conversation during transition.','What can remain reliable while this changes?'],
      ['Meaning Should Be Discovered, Not Assigned','Do not rush to explain why a loss happened or insist it will make the client stronger. Let meaning emerge in the client’s language and timing.','“What are you noticing this experience asks of you?” leaves room.','What meaning, if any, is becoming true for you?'],
      ['Grief May Need Clinical Support','Severe or prolonged impairment, trauma symptoms, danger, or inability to function may require licensed care.','Coaching can support practical re-entry while a therapist treats clinical grief or trauma.','What level of support matches the client’s needs?']
    ],
    14:[
      ['Purpose Is Lived, Not Found Once','Purpose can be a direction expressed through many roles rather than one perfect calling waiting to be discovered.','Teaching, parenting, and mentoring may all express contribution.','What kind of difference feels worth making now?'],
      ['Use Energy as Information','Notice activities that create aliveness, absorption, pride, meaning, or useful fatigue. Energy is one signal, not the only decision rule.','A task can be difficult and still feel deeply worthwhile.','When do you feel most engaged and most yourself?'],
      ['Look for Repeating Threads','Past experiences often reveal themes in strengths, values, people served, and problems someone cares about.','Repeatedly organizing confused groups may point to clarity and service.','What theme keeps appearing across your life?'],
      ['Release the Perfect Answer','Pressure to choose one permanent purpose can create paralysis. Use experiments to learn what fits this season.','Volunteer for one project before changing an entire career.','What small test would provide real information?'],
      ['Direction Needs Constraints','Purpose becomes practical when it accounts for health, money, time, relationships, and responsibilities.','A meaningful plan that cannot be sustained needs redesign, not shame.','What realities must this direction respect?'],
      ['Write a Working Purpose Statement','A useful statement names who or what you want to serve, how you contribute, and the values that guide you. It can evolve.','“I help teams find clarity through calm, honest facilitation.”','What direction is true enough for the next chapter?']
    ],
    15:[
      ['Start With the Value','A goal is stronger when it expresses a chosen value instead of proving worth or chasing approval.','A health goal may express vitality and stewardship rather than appearance.','Why does this matter beyond the result?'],
      ['Define a Clear Outcome','A useful goal is specific enough to recognize without pretending every variable can be controlled.','“Submit three tailored applications by Friday” is clearer than “fix my career.”','What will be visibly different?'],
      ['Separate Outcomes From Actions','Outcomes can depend on other people. Actions are behaviors the client can choose and review.','The client cannot guarantee an offer but can prepare, apply, and follow up.','What part is actually yours?'],
      ['Build Milestones Backward','Break a distant goal into stages, then identify the next small action and the conditions needed for it.','Portfolio, feedback, revision, application—not “do everything this week.”','What must be true before the next milestone?'],
      ['Plan for Friction','Anticipate time, emotion, environment, skill gaps, and competing commitments before they interrupt the plan.','Prepare a ten-minute version for overloaded days.','What is most likely to get in the way?'],
      ['Review and Revise','A roadmap is a learning tool, not a contract with shame. Use evidence to continue, simplify, pause, or change direction.','A missed milestone may reveal an unrealistic sequence or a changed priority.','What does the data suggest we adjust?']
    ],
    16:[
      ['Habits Need a Clear Cue','A habit is easier to repeat when it is linked to a specific time, place, or existing routine.','After pouring morning coffee, write one sentence in the journal.','When and where will this begin?'],
      ['Make the First Version Small','Consistency grows when the minimum action is realistic even on difficult days.','Five minutes of movement can preserve the pattern when thirty is not possible.','What is the smallest version that still counts?'],
      ['Environment Shapes Behavior','Design the surroundings so the desired action is easier and the competing action requires more effort.','Place the workbook on the desk and silence notifications before the session.','What can the environment do for you?'],
      ['A Lapse Is Not a Collapse','Missing once is an event. The story “I always fail” can turn one lapse into abandonment.','Resume at the next available cue rather than waiting for Monday.','What is the next clean opportunity to return?'],
      ['Track What Helps, Not Just Streaks','Review energy, context, obstacles, and support so tracking produces insight rather than punishment.','A habit may work on office days but need another cue at home.','What pattern does the record reveal?'],
      ['Build Identity Through Evidence','Repeated actions can support a chosen identity, but identity should remain flexible and humane.','Each prepared session is evidence of becoming a reliable coach.','What kind of person does this practice help you become?']
    ],
    17:[
      ['Listen to Understand','Effective listening follows the client’s meaning instead of waiting to give advice or demonstrate expertise.','Summarize what matters and ask whether you understood correctly.','What feels most important in what you just said?'],
      ['Ask One Question at a Time','Short, open questions create space. Stacked questions confuse the client and often hide the coach’s preferred answer.','Use “What matters about that?” instead of three questions in one sentence.','What is the one question the conversation needs now?'],
      ['Use Reflections to Check Meaning','Reflect content, emotion, values, or tension as a tentative observation the client can confirm or correct.','“Part of you wants the change, and part wants the safety of what is familiar.”','Does that fit your experience?'],
      ['Challenge With Permission','A challenge should widen awareness without shaming, cornering, or proving the coach right.','“May I share a pattern I am noticing?” gives the client choice.','Would a direct observation be useful?'],
      ['Silence Can Be Productive','A pause gives the client time to feel, think, and find their own words. Do not fill every quiet moment from anxiety.','Count a few breaths before assuming the client is stuck.','What becomes possible if I do not rush?'],
      ['Summarize Into Client Ownership','Close a segment by naming what the client discovered, chose, and wants to do—not by delivering the coach’s verdict.','“What are you taking from this, and what do you want to carry forward?”','How would you say the learning in your own words?']
    ],
    18:[
      ['Contract the Session','Begin by agreeing on the focus, desired value, available time, and what is inside coaching scope.','“What would make today’s conversation useful?” creates a shared direction.','What do you want to leave with today?'],
      ['Follow the Client, Hold the Process','The coach keeps time, focus, ethics, and awareness while the client owns the content, meaning, and decisions.','Redirect gently when a long detour no longer serves the agreed focus.','Is this where you want to spend our remaining time?'],
      ['Explore Before Solving','Slow down enough to understand facts, feelings, values, needs, beliefs, and patterns before designing action.','Advice about productivity may miss fear, grief, or a values conflict.','What needs to be understood before we plan?'],
      ['Use Time Transparently','Name time remaining and invite the client to choose how to use it. Do not surprise them with an abrupt ending.','“We have fifteen minutes. What would be most useful now?”','How shall we use the time that remains?'],
      ['Turn Insight Into Chosen Action','If action fits the session, define a realistic step, likely obstacle, support, and review plan with the client.','A client chooses one conversation, rehearses the opening, and names when it will happen.','What step are you willing to own?'],
      ['Close With Integration','Invite the client to name learning, decision, emotion, commitment, and needed support. Confirm logistics without adding a new topic.','“What are you taking with you?” centers the client’s words.','What feels complete, and what needs to continue?']
    ],
    19:[
      ['Scope Protects the Client','Coaching supports awareness, decisions, goals, and behavior within the coach’s training. It does not diagnose or treat clinical conditions.','Career planning can be coaching; treatment of severe depression belongs with licensed care.','Is this need within my role and competence?'],
      ['Notice Referral Signals','Immediate danger, self-harm, severe impairment, psychosis, abuse risk, medical issues, legal needs, or clinical treatment requests require appropriate support.','A coach responds calmly to risk and follows emergency or referral procedures.','What level and type of help is needed now?'],
      ['Refer Without Abandoning','Explain the limit clearly, affirm the client, name the kind of professional needed, and support a responsible transition when appropriate.','“You deserve support from someone trained to treat this. Let’s identify next steps.”','How can I be clear, respectful, and useful?'],
      ['Confidentiality Has Limits','Explain privacy, records, technology, supervision, and any legal or safety limits before sensitive work arises.','Clients should know how information is handled before they disclose.','What has the client agreed to and understood?'],
      ['Conflicts of Interest Need Action','Dual relationships, gifts, financial interests, and personal needs can impair judgment. Disclose, consult, set boundaries, or refer.','Do not coach a situation when your personal benefit could shape the guidance.','Whose interest is driving this choice?'],
      ['Document and Consult Responsibly','Keep appropriate factual records, protect data, seek qualified consultation, and stay within consent and privacy requirements.','Document observed facts and actions—not speculative diagnoses.','What would a careful professional need to know?']
    ]
  };
  const reviewSource = REVIEW_LIBRARY[lesson] || quiz.slice(0,6).map(item => [item.q.replace(/[?]$/,''),item.why,'Apply the idea to a realistic coaching conversation.','How would the client explain this in their own words?']);
  const reviewCards = reviewSource.map((item,index) => ({
    number:String(index+1).padStart(2,'0'),
    title:item[0],
    summary:item[1],
    example:item[2],
    prompt:item[3]
  }));
  let reviewIndex = 0;
  const renderReview = () => {
    const item = reviewCards[reviewIndex];
    document.getElementById('rlReviewCard').innerHTML = `<article class="rl-review-card"><div><div class="eyebrow">Essential Idea ${item.number}</div><h3>${item.title}</h3><p class="rl-review-summary">${item.summary}</p><div class="rl-review-example"><b>In Practice</b><p>${item.example}</p></div></div><aside class="rl-review-lens"><div><b>Coach’s Reflection</b><strong>${item.prompt}</strong></div><p>Pause here and explain the idea in your own words before moving forward.</p></aside></article>`;
    document.getElementById('rlReviewCount').textContent = `${reviewIndex+1} of ${reviewCards.length}`;
    document.getElementById('rlReviewBack').disabled = reviewIndex === 0;
    document.getElementById('rlReviewNext').classList.toggle('rl-hidden',reviewIndex === reviewCards.length-1);
    document.getElementById('rlBeginQuiz').classList.toggle('rl-hidden',reviewIndex !== reviewCards.length-1);
  };
  document.getElementById('rlReviewBack').onclick = () => { if(reviewIndex>0){reviewIndex--;renderReview();} };
  document.getElementById('rlReviewNext').onclick = () => { if(reviewIndex<reviewCards.length-1){reviewIndex++;renderReview();} };
  document.getElementById('rlBeginQuiz').onclick = () => { localStorage.setItem(reviewKey,'true'); quizButton.disabled=false; quizButton.title=''; show('quiz'); };
  quizButton.disabled = localStorage.getItem(reviewKey) !== 'true';
  quizButton.title = quizButton.disabled ? 'Complete the Lesson Review to unlock the Final Quiz.' : '';
  const answerPattern=[0,2,3,1,2,0,1,3,0,3,1,2];
  quiz.forEach((item,index)=>{
    const correct=item.options[item.answer];
    const others=item.options.filter((_,optionIndex)=>optionIndex!==item.answer);
    const target=answerPattern[(index+lesson)%answerPattern.length];
    others.splice(target,0,correct);
    item.options=others;
    item.answer=target;
  });
  if(typeof resetQuiz==='function') resetQuiz();
  renderReview();
})();

