import React from 'react';
import { JobAlert } from '../types';

interface JobCardProps {
  job: JobAlert;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/50 bg-emerald-950/20";
    if (score >= 75) return "text-blue-400 border-blue-500/50 bg-blue-950/20";
    return "text-yellow-400 border-yellow-500/50 bg-yellow-950/20";
  };

  const getAgeBadge = (hours: number) => {
    if (hours <= 24) return <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-500/30">New ({hours}h)</span>;
    if (hours <= 48) return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-500/30">Recent ({hours}h)</span>;
    return <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-600">{Math.floor(hours/24)}d old</span>;
  };

  const handleApply = () => {
    let url = job.apply_url;

    // Use a robust fallback if the URL is missing, invalid, or a placeholder.
    // This guarantees the button ALWAYS works.
    if (!url || url.length < 5 || url.includes("example.com")) {
       const q = encodeURIComponent(`${job.job_title} ${job.company}`);
       const loc = encodeURIComponent(job.location || 'Sweden');
       const source = (job.source || '').toLowerCase();

       if (source.includes('linkedin')) {
         url = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`;
       } else if (source.includes('arbetsförmedlingen') || source.includes('platsbanken')) {
         // Platsbanken simple search
         url = `https://platsbanken.arbetsformedlingen.se/platsannonser/sok?q=${q}`;
       } else if (source.includes('indeed')) {
         url = `https://se.indeed.com/jobs?q=${q}&l=${loc}`;
       } else {
         // Default fallback to Google Search
         url = `https://www.google.com/search?q=${q}+job+${loc}`;
       }
    }
    
    window.open(url, '_blank');
  };

  const scoreClass = getScoreColor(job.match_score);
  const formattedDate = new Date(job.publish_date_utc).toLocaleString('sv-SE', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="relative group bg-slate-900 border border-slate-700 rounded-lg p-5 hover:border-slate-500 transition-all duration-300 shadow-lg">
      <div className="absolute top-4 right-4 flex flex-col items-end">
        <div className={`text-2xl font-mono font-bold px-3 py-1 rounded border ${scoreClass}`}>
          {job.match_score}
        </div>
        <span className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Match Score</span>
      </div>

      <div className="mb-4 pr-20">
        <div className="flex items-center gap-2 mb-2">
           {getAgeBadge(job.job_age_hours)}
        </div>
        <h3 className="text-xl font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
          {job.job_title}
        </h3>
        <p className="text-slate-400 font-medium">{job.company}</p>
        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {job.location}
          </span>
          <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
          <span>{job.employment_type}</span>
          <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
          <span>{job.seniority}</span>
          <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
          <span className="text-slate-400 font-mono text-xs">{formattedDate}</span>
        </div>
      </div>

      <div className="bg-slate-950/50 rounded p-3 mb-4 border-l-2 border-slate-600">
        <p className="text-sm text-slate-300 italic mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase mr-2">Alert (EN):</span>
          {job.alert_message_en}
        </p>
        <p className="text-sm text-slate-400 italic">
          <span className="text-xs font-bold text-slate-500 uppercase mr-2">Alert (SV):</span>
          {job.alert_message_sv}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {job.key_skills.map((skill, idx) => (
            <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 font-mono">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-600 font-mono">Source: {job.source}</span>
        <button 
          className="text-sm bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleApply}
        >
          Apply Now
        </button>
      </div>
    </div>
  );
};

export default JobCard;