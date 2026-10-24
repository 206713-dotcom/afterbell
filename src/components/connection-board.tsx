import { ArrowUpRight, Check, HeartHandshake, Users, Zap } from "lucide-react";
import { ActivityArt } from "./visuals";

/** A labelled illustration; live outcomes are shown in the Lab and session room. */
export function ConnectionBoard() {
  return (
    <div
      className="connection-board"
      role="img"
      aria-label="Illustration: three badminton players, a fourth player who needs a racket, and a neighbour with a spare racket can form one shared plan."
    >
      <div className="board-orbit board-orbit-one" />
      <div className="board-orbit board-orbit-two" />
      <div className="board-star">✳</div>
      <div className="board-court">
        <ActivityArt category="badminton" />
        <div className="board-court-caption">
          <span>
            <Users size={15} /> A SATURDAY KIND OF PLAN
          </span>
          <strong>
            Good game.
            <br />
            Better company.
          </strong>
          <div className="board-people">
            <i>A</i>
            <i>M</i>
            <i>Y</i>
            <i>+</i>
            <span>Room for one more.</span>
          </div>
        </div>
      </div>
      <div className="board-ticket board-ticket-person">
        <span className="board-ticket-icon">
          <Users size={20} />
        </span>
        <div>
          <b>“I’m in. Just need a racket.”</b>
          <small>A player with one missing piece</small>
        </div>
        <ArrowUpRight size={17} />
      </div>
      <div className="board-ticket board-ticket-racket">
        <span className="board-ticket-icon">
          <HeartHandshake size={20} />
        </span>
        <div>
          <b>“You can borrow my spare.”</b>
          <small>A neighbour. A new possibility.</small>
        </div>
        <Check size={17} />
      </div>
      <div className="board-stamp">
        <Zap size={17} fill="currentColor" />
        <span>
          A LITTLE CONNECTION.<b>A WHOLE NEW PLAN.</b>
        </span>
      </div>
      <span className="board-illustration-label">
        An illustrated possibility
      </span>
    </div>
  );
}
