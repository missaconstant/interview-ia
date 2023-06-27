import { useState } from "react";
import { Configuration, OpenAIApi } from 'openai';
import Logo from './assets/images/logo.png';
import { Loading } from "./components/Loading/Loading";
import { pdfGenerate } from "./utils/pdfgenerate";
import { envars } from "./constants/envars";
import { skills } from "./constants/skills";

const configs = new Configuration({ apiKey: envars.OPENAI_SECRET });

function App() {
	const nbrMaxQuestions = parseInt(envars.NBR_QUESTIONS);
	const questionDuration = parseInt(envars.QUESTION_DURATION);
  	const openai = new OpenAIApi(configs);
	const [questions, setQuestions] = useState([]);
	const [answers, setAnswers] = useState([]);
	const [currentQuestion, setCurrentQuestion] = useState(null);
	const [chatMessages, setChatMessages] = useState([]);
	const [nthQuestion, setNthQuestion] = useState(0);
	const [loading, setLoading] = useState(false);
	const [category, setCategory] = useState(0);
	const [questionTimeout, setQuestionTimeout] = useState(null);
	const [timer, setTimer] = useState({ starts: 0, ends: 0 });

	const getAwnswer = async (lines) => {
		const answer = await openai.createCompletion({
			prompt: lines.join("\n"),
			model: 'text-davinci-003',
			temperature: 0.7,
			max_tokens: 512,
			top_p: 1.0,
			frequency_penalty: 0,
			presence_penalty: 0,
			best_of: 1,
		});

		return answer;
	};

	const startProcess = async () => {
		if (questions.length === 0) {
			await askQuestion(`
				Imagine que tu sois un examen technique en ${category} de niveau intermédiaire à avancé.
				Tes Questions sont précices et donnent lieu à des réponses brèves et dirèctes.
				Tes questions peuvent porter sur n'importe quel sujet lié de près ou de loin à aux domaines donnés précédemment.
				Ne donne pas la reponse à tes questions.
				Evalue la reponse que je donnée après chacune de tes question.
				Pose ta première question.
			`);

			setTimer({ starts: (new Date()).getTime(), ends: 0 });
			return;
		}
	};

	const evaluation = async (questions_list=[]) => {
		const answer = await getAwnswer([`
			Je te donne une liste qui contient des questions suivies de leurs reponses.
			Evalue si la reponse est pertinente par rapport à la question en lui attribuant une note.
			La note que tu attribue pour chaque reponse est comprise entre 0 et 5.
			Et ajoute la reponse correcte à l'évaluation.
			Ton evaluation doit suivre le schema suivant: Reponse x : correcte ou incorrect : note : reponse correcte.
			Evalue bien toutes les question.
			Voici la liste:
			${
				questions_list.map((x, y) => {
					return "Question " + (y + 1) + ":" + x.question + "\n" + x.userEntry;
				})
				.join("\n\n")
			}
		`]);
		
		return answer.data.choices[0].text;
	};

	const askMoreQuestion = async () => {
		await askQuestion('Pose une autre question.');
	};

	const askQuestion = async (text, ignoreStoring=false) => {
		setLoading(true);
		const isAnswer = text.match(/^Ma reponse/);

		// the progress bar
		if (isAnswer) {
			stopProgressBar();

			if (questionTimeout) {
				clearTimeout(questionTimeout);
				setQuestionTimeout(null);
			}
		}

		const lines = [...chatMessages, text];
		const answer = await getAwnswer(lines);
		const question = answer.data.choices[0].text;

		// new lists
		const newQuestions = isAnswer ? [...questions] : [...questions, { question }];
		const newAnswers = isAnswer ? [...answers, text] : [...answers];

		// is this an answer ?
		setChatMessages([...lines, question]);
		isAnswer && setAnswers(newAnswers);
		!ignoreStoring && setQuestions(newQuestions);
		!ignoreStoring && setCurrentQuestion(question);
		!ignoreStoring && setNthQuestion(nthQuestion + 1);

		// the progress bar and textare focus
		if (!isAnswer) {
			restartProgressBar();
			const val = setTimeout(
				() => document.querySelector('.pass-btn').click(),
				questionDuration * 1000
			);
			setQuestionTimeout(val);

			setLoading(false);
			setTimeout(() => {
				document.querySelector('textarea').focus();
			}, 100);
		}
		return { newQuestions, newAnswers };
	};

	const givingAnswer = (answer) => {
		// end timer first when it's over
		setTimer({ ...timer, ends: (new Date()).getTime() });

		askQuestion("Ma reponse: " + answer, true)
		.then(async ({ newQuestions, newAnswers }) => {
			if (nthQuestion === nbrMaxQuestions) {
				await stopQuestions(newQuestions, newAnswers);
				return;
			}
			await askMoreQuestion();
		});
	};

	const stopQuestions = async (_questions, _answers) => {
		const response = await evaluation(
			_questions
			.map((x, y) => ({ ...x, userEntry: _answers[y] }))
		);

		// report
		const results = parseEvaluation(response, _questions, _answers);
		generateReport({ category, results, duration: timer.ends - timer.starts });
		
		// reinitializing
		setCurrentQuestion('');
		setQuestions([]);
		setAnswers([]);
		setChatMessages([]);
		setNthQuestion(0);
		setLoading(false);
	};

	const restartProgressBar = () => {
		const bar = document.querySelector('.progress-bar');
		bar.classList.remove('ease-linear');
		bar.removeAttribute('style');

		setTimeout(() => {
			bar.classList.remove('hidden');
			setTimeout(() => {
				bar.classList.add('ease-linear');
				bar.style.transitionDuration = questionDuration + 's'
				document.querySelector('.progress-bar').style.width = 0 + 'px';
			}, 100)
		}, 100);
	};

	const stopProgressBar = () => {
		const bar = document.querySelector('.progress-bar');
		bar.classList.add('hidden');
	};

	const parseEvaluation = (evaluationResponse, _questions, _answers) => {
		const parts = evaluationResponse.split("\n").filter(
			x => x.trim().length
		).map(
			(item, idx) => {
				const splitted = item.replaceAll(/note\s:\s|Reponse correcte:\s/gi, '').trim().split(':');

				return {
					title: 'Question ' + (idx + 1),
					question: _questions[idx].question.trim(),
					answer: _answers[idx].trim().replaceAll(/Ma reponse:\s|\t|\n/g, ''),
					note: splitted[2].trim(),
					status: splitted[1].trim().toLowerCase(),
					correct: splitted[3].trim()
				};
			}
		);
		return parts;
	};

	const generateReport = (datas) => {
		const promise = pdfGenerate(datas);
		promise.then(r => {
			window.open(URL.createObjectURL(r), '_blank');
		});
	};

	return (
		<div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
			<div className="w-[570px] min-h-[600px] bg-gray-800 rounded-md shadow-xl flex flex-col p-5 gap-4">
				{/* header */}
				<div className="py-0 rounded-md flex items-center">
					{/* <h2 className="text-gray-300 text-3xl font-bold m-0">Entretien AI</h2> */}
					<img src={Logo} className="w-60" alt="Logo" />
					<div className="ml-auto">
						{nthQuestion === 0 ? (
							<button
								disabled={!category || loading}
								onClick={() => startProcess()}
								className="bg-gray-900 rounded-md text-gray-500 px-4 py-2 disabled:cursor-not-allowed"
							>Commencer</button>
						) : (
							<button
								className="bg-gray-900 rounded-md text-gray-500 px-4 py-2"
							>{nthQuestion +'/'+ nbrMaxQuestions}</button>
						)}
					</div>
				</div>

				{/* body */}
				<div className="bg-gray-900 flex-1 rounded-md flex flex-col justify-center overflow-hidden">
					<div className="flex flex-1 items-center justify-center px-3">
						{!loading && (<h3 className="text-white text-2xl font-bold text-center">{ currentQuestion || '' }</h3>)}
						{loading && (<Loading />)}
						{nthQuestion === 0 && !loading && (
							<div className="text-center bg-gray-800 p-5 rounded-md">
								<h3 className="text-white text-2xl font-bold">Choisissez une catégorie</h3>
								<select
									onChange={evt => setCategory(evt.target.value)}
									defaultValue={category}
									className="w-full mt-5 outline-none bg-transparent border border-gray-900 p-3 text-white"
								>
									<option value="0" disabled>Choisir</option>
									{skills.map((item, idx) => (
										<option defaultValue={item.toUpperCase} key={idx}>{item}</option>
									))}
								</select>
							</div>
						)}
					</div>
					<div
						className={`
							progress-bar
							h-2 w-full bg-[#4EAC6E] mt-auto
						`}
					></div>
				</div>

				{/* answer field */}
				{nthQuestion !== 0 && answers.length !== nbrMaxQuestions && !loading && (
					<div className="mt-auto bg-gray-900 h-16 rounded-md">
						<textarea
							placeholder="Votre reponse ..."
							className="w-full h-full bg-transparent resize-none outline-none p-2 text-gray-500"
							disabled={loading}
							onKeyUp={e => {
								if (e.code === 'Enter') {
									givingAnswer(e.target.value);
									e.target.value = '';
								}
							}}
						></textarea>
					</div>
				)}

				{/* hidden */}
				<button className="pass-btn hidden" onClick={() => givingAnswer('Je ne sais pas.')}></button>
			</div>
		</div>
	)
}

export default App;
