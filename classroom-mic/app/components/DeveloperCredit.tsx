export default function DeveloperCredit() {
  return (
    <div className="w-full bg-[#111827] border-t border-[#1f2937] px-5 py-4 flex flex-col items-center gap-2">
      <p className="text-gray-600 text-xs">
        Built by <span className="text-gray-400 font-semibold">Mustak</span> · Outlier Lab
      </p>
      <div className="flex items-center gap-3 flex-wrap justify-center text-xs">
        <a href="https://github.com/Outlier1217/YouTube-Classroom-mic" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition">
          GitHub
        </a>
        <span className="text-gray-700">•</span>
        <a href="https://www.linkedin.com/in/mustak1217/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition">
          LinkedIn
        </a>
        <span className="text-gray-700">•</span>
        <a href="https://www.youtube.com/@Outlier-lab" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-400 transition">
          YouTube
        </a>
        <span className="text-gray-700">•</span>
        <a href="https://www.kaggle.com/mustak1217" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition">
          Kaggle
        </a>
        <span className="text-gray-700">•</span>
        <a href="mailto:mustakaalam10@gmail.com" className="text-gray-500 hover:text-emerald-400 transition">
          Email
        </a>
      </div>
    </div>
  );
}