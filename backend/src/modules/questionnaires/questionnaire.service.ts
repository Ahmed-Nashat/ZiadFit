import { Types } from "mongoose";
import { roleEnum } from "../../common/enums/role.enum.js";
import { exceptions } from "../../common/exceptions/index.js";
import {
  questionnaireRepo,
  type QuestionnaireRepo,
} from "../../common/repo/questionnaire.repo.js";
import { userRepo, type UserRepo } from "../../common/repo/user.repo.js";
import type { IQuestionnaireAnswers } from "../../common/interface/questionnaire.interface.js";

interface ISubmitQuestionnaire {
  clientId: string;
  answers: IQuestionnaireAnswers;
}

class QuestionnaireService {
  private readonly questionnaireRepo: QuestionnaireRepo;
  private readonly userRepo: UserRepo;

  constructor() {
    this.questionnaireRepo = questionnaireRepo;
    this.userRepo = userRepo;
  }

  // ---------------------- SUBMIT QUESTIONNAIRE -------------
  async submitQuestionnaire({ clientId, answers }: ISubmitQuestionnaire) {
    const id = new Types.ObjectId(clientId);
    const client = await this.userRepo.findOne({
      filter: { _id: id, role: roleEnum.client },
    });
    if (!client)
      throw new exceptions.ForbiddenException("Client account required");
    if (!client.emailVerifiedAt)
      throw new exceptions.ForbiddenException(
        "Verify your email before submitting a questionnaire",
      );
    const questionnaire = await this.questionnaireRepo.createSubmission({
      clientId: id,
      answers,
    });
    return {
      id: String(questionnaire._id),
      status: questionnaire.status,
      submittedAt: questionnaire.submittedAt,
    };
  }
}

export const questionnaireService = new QuestionnaireService();
